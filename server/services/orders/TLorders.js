import { ObjectID } from 'mongodb';
import handlebars from 'handlebars';
import bcrypt from 'bcrypt';
import settings from '../../lib/settings';
import { db } from '../../lib/mongo';
import parse from '../../lib/parse';
import webhooks from '../../lib/webhooks';
import dashboardWebSocket from '../../lib/dashboardWebSocket';
import mailer from '../../lib/mailer';
import CustomersService from '../customers/customers';
import OrderStatusesService from './orderStatuses';
import PaymentMethodsLightService from './paymentMethodsLight';
import ShippingMethodsLightService from './shippingMethodsLight';
import EmailTemplatesService from '../settings/emailTemplates';
import ProductStockService from '../products/stock';
import SettingsService from '../settings/settings';
import PaymentGateways from '../../paymentGateways';
import { apiTLPlaceOrder } from '../../lib/TLapi';

const { saltRounds } = settings;

class TLOrdersService {
	getFilter(params = {}) {
		// TODO: sort, coupon, tag, channel
		const filter = {};
		const id = parse.getObjectIDIfValid(params.id);
		const status = parse.getString(params.status);
		const fulfilment_status = parse.getString(params.fulfilment_status);
		const customer_id = parse.getObjectIDIfValid(params.customer_id);
		const payment_method = parse.getObjectIDIfValid(params.payment_method);
		const grand_total_min = parse.getNumberIfPositive(params.grand_total_min);
		const grand_total_max = parse.getNumberIfPositive(params.grand_total_max);
		const date_placed_min = parse.getDateIfValid(params.date_placed_min);
		const date_placed_max = parse.getDateIfValid(params.date_placed_max);
		const date_closed_min = parse.getDateIfValid(params.date_closed_min);
		const date_closed_max = parse.getDateIfValid(params.date_closed_max);

		if (id) {
			filter._id = new ObjectID(id);
		}

		if (status) {
			filter.status_id = status;
		}

		if (fulfilment_status) {
			filter.fulfilment_status = fulfilment_status;
		}

		if (customer_id) {
			filter.customer_id = customer_id;
		}

		if (payment_method) {
			filter.payment_method = payment_method;
		}

		if (grand_total_min || grand_total_max) {
			filter.grand_total = {};
			if (grand_total_min) {
				filter.grand_total.$gte = grand_total_min;
			}
			if (grand_total_max) {
				filter.grand_total.$lte = grand_total_max;
			}
		}

		if (date_placed_min || date_placed_max) {
			filter.date_placed = {};
			if (date_placed_min) {
				filter.date_placed.$gte = date_placed_min;
			}
			if (date_placed_max) {
				filter.date_placed.$lte = date_placed_max;
			}
		}

		if (date_closed_min || date_closed_max) {
			filter.date_closed = {};
			if (date_closed_min) {
				filter.date_closed.$gte = date_closed_min;
			}
			if (date_closed_max) {
				filter.date_closed.$lte = date_closed_max;
			}
		}

		if (params.search) {
			const alternativeSearch = [];

			const searchAsNumber = parse.getNumberIfPositive(params.search);
			if (searchAsNumber) {
				alternativeSearch.push({ number: searchAsNumber });
			}

			// alternativeSearch.push({ first_name: new RegExp(params.search, 'i') });
			// alternativeSearch.push({ last_name: new RegExp(params.search, 'i') });
			// alternativeSearch.push({ password: new RegExp(params.search, 'i') });
			// alternativeSearch.push({ email: new RegExp(params.search, 'i') });
			// alternativeSearch.push({ mobile: new RegExp(params.search, 'i') });
			alternativeSearch.push({ $text: { $search: params.search } });

			filter.$or = alternativeSearch;
		}

		return filter;
	}

	getOrders(params) {
		const filter = this.getFilter(params);
		const limit = parse.getNumberIfPositive(params.limit) || 1000;
		const offset = parse.getNumberIfPositive(params.offset) || 0;

		return Promise.all([
			db
				.collection('TLorders')
				.find(filter)
				.sort({ date_placed: 1, date_created: 1 })
				.skip(offset)
				.limit(limit)
				.toArray(),
			db.collection('TLorders').countDocuments(filter),
		]).then(([orders, ordersCount]) => {
			const result = {
				total_count: ordersCount,
				has_more: offset + orders.length < ordersCount,
				data: orders,
			};
			return result;
		});
	}

	getSingleOrder(id) {
		if (!id) {
			return Promise.reject('Invalid identifier');
		}
		return this.getOrders({ id }).then((items) => (items.data.length > 0 ? items.data[0] : {}));
	}

	getValidDocumentForInsert(data) {
		const order = {
			date_created: new Date(),
			date_updated: null,
		};

		order._id = parse.getString(data.id);
		order.date = parse.getString(data.date);
		order.status = parse.getString(data.status).toLowerCase();
		order.fulfilment_status = parse.getString(data.fulfilment_status).toLowerCase();
		order.language = parse.getString(data.language);
		order.shippings = parse.getArrayIfValid(data.shippings);
		order.payment_method = parse.getString(data.payment_method);
		order.billing_currency = parse.getString(data.billing_currency);
		order.estimated_currency = parse.getString(data.estimated_currency);
		order.estimated_to_billing_currency_conv = parse.getString(data.estimated_to_billing_currency_conv);
		order.invoice = parse.getArrayIfValid(data.invoice);
		order.receipt_endpoint = parse.getString(data.receipt_endpoint);
		order.billing_address = parse.getObject(data.billing_address);
		order.shipping_address = parse.getObject(data.shipping_address);
		order.products = parse.getArrayIfValid(data.products);
		order.totals = parse.getArrayIfValid(data.totals);

		return order;
	}

	async addOrder(data) {
		const order = await this.getValidDocumentForInsert(data);
		const insertResponse = await db.collection('TLorders').insertMany([order]);
		const newOrderId = insertResponse.ops[0]._id.toString();
		const newOrder = await this.getSingleOrder(newOrderId);
		return newOrder;
	}

	async updateOrder(id, data) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(id);
		await db.collection('TLorders').updateOne({ _id: orderObjectID }, { $set: data });
		const updatedOrder = await this.getSingleOrder(id);
		if (updatedOrder.draft === false) {
			await webhooks.trigger({
				event: webhooks.events.ORDER_UPDATED,
				payload: updatedOrder,
			});
		}
		return updatedOrder;
	}

	async deleteOrder(orderId) {
		if (!ObjectID.isValid(orderId)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(orderId);
		const order = await this.getSingleOrder(orderId);
		await webhooks.trigger({
			event: webhooks.events.ORDER_DELETED,
			payload: order,
		});
		const deleteResponse = await db.collection('TLorders').deleteOne({ _id: orderObjectID });
		return deleteResponse.deletedCount > 0;
	}

	parseProductItem(item) {
		return item
			? {
					sku: parse.getString(item.sku),
					quantity: parse.getNumberIfPositive(item.quantity),
					gift: parse.getBooleanIfValid(item.gift, false),
					gift_message: parse.getString(item.gift_message),
					customization_text: parse.getString(item.customization_text),
					customization_font_code: parse.getString(item.customization_font_code),
			  }
			: null;
	}

	getValidRequest(data) {
		const request = {};
		request.language = 'en';
		request.currency = 'USD';
		request.name = parse.getString(data.shipping_address.first_name);
		request.last_name = parse.getString(data.shipping_address.last_name);
		request.email = parse.getString(data.shipping_address.email);
		request.street_address_1 = parse.getString(data.shipping_address.address1);
		request.street_address_2 = parse.getString(data.shipping_address.address2);
		request.postcode = parse.getString(data.shipping_address.postal_code);
		request.company = parse.getString(data.shipping_address.company);
		request.city = parse.getString(data.shipping_address.city);
		request.iso_code_2 = parse.getString(data.shipping_address.country.code);
		request.state_code = parse.getString(data.shipping_address.state.code);
		request.state = parse.getString(data.shipping_address.state.name);
		request.phone = parse.getString(data.shipping_address.phone);
		request.carrier = parse.getString(data.carrier);
		request.carrier_service_level = parse.getString(data.carrier_service_level);
		request.coupon = parse.getString(data.coupon);
		request.use_credits = parse.getBooleanIfValid(data.use_credits, false);
		request.comments = parse.getString(data.comments);
		request.products = data.items.map((item) => this.parseProductItem(item));
		// request.account_ref = parse.getString(data.account_ref);
		return request;
	}

	async checkoutOrder(order) {
		const TLrequest = this.getValidRequest(order);
		const TLorder = await apiTLPlaceOrder(TLrequest);
		console.log(TLorder);
		if (TLorder && !TLorder.error) {
			return this.addOrder(TLorder.order);
		}
	}

	cancelOrder(orderId) {
		const orderData = {
			cancelled: true,
			date_cancelled: new Date(),
		};

		return this.updateOrder(orderId, orderData);
	}
}

export default new TLOrdersService();

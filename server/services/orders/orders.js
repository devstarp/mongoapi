import { ObjectID } from 'mongodb';
import handlebars from 'handlebars';
import settings from '../../lib/settings';
import { db } from '../../lib/mongo';
import parse from '../../lib/parse';
import webhooks from '../../lib/webhooks';
import dashboardWebSocket from '../../lib/dashboardWebSocket';
import mailer from '../../lib/mailer';
import CustomersService from '../customers/customers';
import OrderItemsService from './orderItems';
import PaymentMethodsLightService from './paymentMethodsLight';
import EmailTemplatesService from '../settings/emailTemplates';
import ProductStockService from '../products/stock';
import SettingsService from '../settings/settings';
import PaymentGateways from '../../paymentGateways';
import TLorders from './TLorders';
import { get, find } from 'lodash';

const { saltRounds } = settings;

class OrdersService {
	getFilter(params = {}) {
		// TODO: sort, coupon, tag, channel
		const filter = {};
		const id = parse.getObjectIDIfValid(params.id);
		const status_id = parse.getObjectIDIfValid(params.status_id);
		const customer_id = parse.getObjectIDIfValid(params.customer_id);
		const payment_method_id = parse.getObjectIDIfValid(params.payment_method_id);
		const shipping_method_id = parse.getObjectIDIfValid(params.shipping_method_id);
		const closed = parse.getBooleanIfValid(params.closed);
		const cancelled = parse.getBooleanIfValid(params.cancelled);
		const delivered = parse.getBooleanIfValid(params.delivered);
		const paid = parse.getBooleanIfValid(params.paid);
		const draft = parse.getBooleanIfValid(params.draft);
		const hold = parse.getBooleanIfValid(params.hold);
		const grand_total_min = parse.getNumberIfPositive(params.grand_total_min);
		const grand_total_max = parse.getNumberIfPositive(params.grand_total_max);
		const date_placed_min = parse.getDateIfValid(params.date_placed_min);
		const date_placed_max = parse.getDateIfValid(params.date_placed_max);
		const date_closed_min = parse.getDateIfValid(params.date_closed_min);
		const date_closed_max = parse.getDateIfValid(params.date_closed_max);

		if (id) {
			filter._id = new ObjectID(id);
		}

		if (status_id) {
			filter.status_id = status_id;
		}

		if (customer_id) {
			filter.customer_id = customer_id;
		}

		if (payment_method_id) {
			filter.payment_method_id = payment_method_id;
		}

		if (shipping_method_id) {
			filter.shipping_method_id = shipping_method_id;
		}

		if (params.number) {
			filter.number = params.number;
		}

		if (closed !== null) {
			filter.closed = closed;
		}

		if (cancelled !== null) {
			filter.cancelled = cancelled;
		}

		if (delivered !== null) {
			filter.delivered = delivered;
		}

		if (paid !== null) {
			filter.paid = paid;
		}

		if (draft !== null) {
			filter.draft = draft;
		}

		if (hold !== null) {
			filter.hold = hold;
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

			alternativeSearch.push({ first_name: new RegExp(params.search, 'i') });
			alternativeSearch.push({ last_name: new RegExp(params.search, 'i') });
			alternativeSearch.push({ password: new RegExp(params.search, 'i') });
			alternativeSearch.push({ email: new RegExp(params.search, 'i') });
			alternativeSearch.push({ mobile: new RegExp(params.search, 'i') });
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
				.collection('orders')
				.find(filter)
				.sort({ date_placed: 1, date_created: 1 })
				.skip(offset)
				.limit(limit)
				.toArray(),
			db.collection('orders').countDocuments(filter),
			PaymentMethodsLightService.getMethods(),
		]).then(([orders, ordersCount, paymentMethods]) => {
			const items = orders.map((order) => this.changeProperties(order, paymentMethods));
			const result = {
				total_count: ordersCount,
				has_more: offset + items.length < ordersCount,
				data: items,
			};
			return result;
		});
	}

	getSingleOrder(id) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		return this.getOrders({ id }).then((items) => (items.data.length > 0 ? items.data[0] : {}));
	}

	async addOrder(data) {
		const order = await this.getValidDocumentForInsert(data);
		const insertResponse = await db.collection('orders').insertMany([order]);
		const newOrderId = insertResponse.ops[0]._id.toString();
		const newOrder = await this.getSingleOrder(newOrderId);
		return newOrder;
	}

	async updateOrder(id, data) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(id);
		const orderData = await this.getValidDocumentForUpdate(id, data);
		console.log(orderData);
		orderData.items &&
			(await Promise.all(orderData.items.map((item) => OrderItemsService.updateItem(id, item.sku, item))));
		await db.collection('orders').updateOne({ _id: orderObjectID }, { $set: orderData });
		const updatedOrder = await this.getSingleOrder(id);
		if (updatedOrder.draft === false) {
			await webhooks.trigger({
				event: webhooks.events.ORDER_UPDATED,
				payload: updatedOrder,
			});
		}
		// await this.updateCustomerStatistics(updatedOrder.customer_id);
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
		const deleteResponse = await db.collection('orders').deleteOne({ _id: orderObjectID });
		return deleteResponse.deletedCount > 0;
	}

	parseDiscountItem(discount) {
		return discount
			? {
					id: new ObjectID(),
					name: parse.getString(discount.name),
					amount: parse.getNumberIfPositive(discount.amount),
			  }
			: null;
	}

	parseProductItem(item) {
		return item
			? {
					id: new ObjectID(),
					product_id: parse.getObjectIDIfValid(item.product_id),
					// variant_id: parse.getObjectIDIfValid(item.variant_id),
					quantity: parse.getNumberIfPositive(item.quantity),
					// "sku":"",
					// "name":"",
					// "variant_name":"",
					// "price":"",
					// "tax_class":"",
					// "tax_total":"",
					// "weight":"",
					// "discount_total":"",
					// "price_total":"", //price * quantity
			  }
			: null;
	}

	parseTransactionItem(transaction) {
		return transaction
			? {
					id: new ObjectID(),
					transaction_id: parse.getString(transaction.transaction_id),
					amount: parse.getNumberIfPositive(transaction.amount),
					currency: parse.getString(transaction.currency),
					status: parse.getString(transaction.status),
					details: transaction.details,
					success: parse.getBooleanIfValid(transaction.success),
					date_created: new Date(),
					date_updated: null,
			  }
			: null;
	}

	getValidDocumentForInsert(data) {
		return db
			.collection('orders')
			.find({}, { number: 1 })
			.sort({ number: -1 })
			.limit(1)
			.toArray()
			.then((items) => {
				let orderNumber = settings.orderStartNumber;
				if (items && items.length > 0) {
					orderNumber = items[0].number + 1;
				}

				const order = {
					date_created: new Date(),
					date_placed: null,
					date_updated: null,
					date_closed: null,
					date_paid: null,
					date_cancelled: null,
					number: orderNumber,
					totals: [],
					// 'weight_total': 0,
					// 'discount_total': 0, //sum(items.discount_total)+sum(discounts.amount)
					// 'tax_included_total': 0, //if(item_tax_included, 0, item_tax) + if(shipment_tax_included, 0, shipping_tax)
					// 'tax_total': 0, //item_tax + shipping_tax
					// 'subtotal': 0, //sum(items.price_total)
					// 'shipping_total': 0, //shipping_price-shipping_discount
					// 'grand_total': 0 //subtotal + shipping_total + tax_included_total - (discount_total)
				};

				order.items = data.items && data.items.length > 0 ? data.items.map((item) => this.parseProductItem(item)) : [];
				// order.transactions =
				// 	data.transactions && data.transactions.length > 0
				// 		? data.transactions.map((transaction) => this.parseTransactionItem(transaction))
				// 		: [];
				// order.discounts =
				// 	data.discounts && data.discounts.length > 0
				// 		? data.discounts.map((discount) => this.parseDiscountItem(discount))
				// 		: [];

				order.billing_address = parse.getOrderAddress(data.billing_address);
				order.shipping_address = parse.getOrderAddress(data.shipping_address);
				order.closed = parse.getBooleanIfValid(data.closed, false);
				order.cancelled = parse.getBooleanIfValid(data.cancelled, false);
				order.delivered = parse.getBooleanIfValid(data.delivered, false);
				order.paid = parse.getBooleanIfValid(data.paid, false);
				order.hold = parse.getBooleanIfValid(data.hold, false);
				order.draft = parse.getBooleanIfValid(data.draft, true);
				order.referrer_url = parse.getString(data.referrer_url).toLowerCase();
				order.landing_url = parse.getString(data.landing_url).toLowerCase();
				order.comments = parse.getString(data.comments);
				order.shippings = parse.getArrayIfValid(data.shippings);
				order.customer_id = parse.getObjectIDIfValid(data.customer_id);
				order.status = parse.getString(data.status);
				order.fulfilment_status = parse.getString(data.fulfilment_status);
				order.payment_method_id = parse.getObjectIDIfValid(data.payment_method_id);
				order.tags = parse.getArrayIfValid(data.tags) || [];
				order.browser = parse.getBrowser(data.browser);

				return order;
			});
	}

	getValidDocumentForUpdate(id, data) {
		return new Promise((resolve, reject) => {
			if (Object.keys(data).length === 0) {
				reject(new Error('Required fields are missing'));
			}

			const order = {
				date_updated: new Date(),
			};

			if (data.payment_token !== undefined) {
				order.payment_token = parse.getString(data.payment_token);
			}

			if (data.closed !== undefined) {
				order.closed = parse.getBooleanIfValid(data.closed, false);
			}
			if (data.cancelled !== undefined) {
				order.cancelled = parse.getBooleanIfValid(data.cancelled, false);
			}
			if (data.delivered !== undefined) {
				order.delivered = parse.getBooleanIfValid(data.delivered, false);
			}
			if (data.paid !== undefined) {
				order.paid = parse.getBooleanIfValid(data.paid, false);
			}
			if (data.hold !== undefined) {
				order.hold = parse.getBooleanIfValid(data.hold, false);
			}
			if (data.draft !== undefined) {
				order.draft = parse.getBooleanIfValid(data.draft, true);
			}

			if (data.referrer_url !== undefined) {
				order.referrer_url = parse.getString(data.referrer_url).toLowerCase();
			}
			if (data.landing_url !== undefined) {
				order.landing_url = parse.getString(data.landing_url).toLowerCase();
			}

			if (data.comments !== undefined) {
				order.comments = parse.getString(data.comments);
			}
			if (data.customer_id !== undefined) {
				order.customer_id = parse.getObjectIDIfValid(data.customer_id);
			}
			if (data.payment_method_id !== undefined) {
				order.payment_method_id = parse.getObjectIDIfValid(data.payment_method_id);
			}
			if (data.carrier !== undefined) {
				order.carrier = parse.getString(data.carrier);
			}
			if (data.carrier_service_level !== undefined) {
				order.carrier_service_level = parse.getString(data.carrier_service_level);
			}
			if (data.tags !== undefined) {
				order.tags = parse.getArrayIfValid(data.tags) || [];
			}
			if (data.browser !== undefined) {
				order.browser = parse.getBrowser(data.browser);
			}
			if (data.date_placed !== undefined) {
				order.date_placed = parse.getDateIfValid(data.date_placed);
			}
			if (data.date_paid !== undefined) {
				order.date_paid = parse.getDateIfValid(data.date_paid);
			}
			if (data.invoice_url !== undefined) {
				order.invoice = parse.getString(data.invoice_url);
			}
			if (data.id !== undefined) {
				order.tl_order_id = parse.getString(data.id);
			}
			// if (data.totals !== undefined) {
			// 	order.totals = parse.getArrayIfValid(data.totals);
			// }
			if (data.tl_order_id !== undefined) {
				order.tl_order_id = parse.getString(data.tl_order_id);
			}
			if (data.status !== undefined) {
				order.status = parse.getString(data.status);
			}
			if (data.fulfilment_status !== undefined) {
				order.fulfilment_status = parse.getString(data.fulfilment_status);
			}
			if (data.shippings !== undefined) {
				order.shippings = parse.getArrayIfValid(data.shippings);
			}
			// if (data.products !== undefined) {
			// 	order.items = parse.getArrayIfValid(data.products);
			// }
			resolve(order);
		});
	}

	changeProperties(order, paymentMethods) {
		if (order && order.draft) {
			order.id = order._id.toString();
			delete order._id;
			const orderPaymentMethod =
				order.payment_method_id && paymentMethods.length > 0
					? paymentMethods.find((i) => i.id.toString() === order.payment_method_id.toString())
					: null;
			order.payment_method = orderPaymentMethod ? orderPaymentMethod.name : '';
			order.payment_method_gateway = orderPaymentMethod ? orderPaymentMethod.gateway : '';

			let sum_items_price_total = 0;
			let sum_items_discount_total = 0;
			let sum_discounts_amount = 0;
			let sum_items_tax_total = 0;
			let shipping_total = 0;

			if (order.items && order.items.length > 0) {
				order.items.forEach((item) => {
					const item_weight = item.weight * item.quantity;
					if (item_weight > 0) {
						sum_items_weight += item_weight;
					}
				});

				order.items.forEach((item) => {
					if (item.price_total > 0) {
						sum_items_price_total += item.price_total;
					}
				});

				order.items.forEach((item) => {
					if (item.price_total > 0 && order.tax_rate > 0) {
						if (order.item_tax_included) {
							sum_items_tax_total += item.price_total - item.price_total / (1 + order.tax_rate / 100);
						} else {
							sum_items_tax_total += item.price_total * (order.tax_rate / 100);
						}
					}
				});

				order.items.forEach((item) => {
					if (item.discount_total > 0) {
						sum_items_discount_total += item.discount_total;
					}
				});
			}

			const tax_included_total =
				(order.item_tax_included ? 0 : sum_items_tax_total) + (order.shipping_tax_included ? 0 : order.shipping_tax);

			if (order.discounts && order.discounts.length > 0) {
				order.items.forEach((item) => {
					if (item.amount > 0) {
						sum_discounts_amount += item.amount;
					}
				});
			}
			order.sub_total = sum_items_price_total; // sum(items.price_total)
			const shippingMethods = order.shipping_methods;
			const carrierLevel = get(shippingMethods, `rate.${get(order, 'carrier_service_level')}`);
			shipping_total = Number(
				get(
					find(carrierLevel, (e) => e.carrier === get(order, 'carrier')),
					'rate'
				)
			);
			order.shipping_total = shipping_total; // shipping_price-shipping_discount
			// const tax_total = sum_items_tax_total + order.shipping_tax;
			// const discount_total = Number(sum_items_discount_total) + Number(sum_discounts_amount);
			// order.weight_total = sum_items_weight;
			// order.discount_total = discount_total; // sum(items.discount_total)+sum(discounts.amount)
			// order.tax_included_total = tax_included_total; // if(item_tax_included, 0, item_tax) + if(shipment_tax_included, 0, shipping_tax)
			// order.tax_total = tax_total; // item_tax + shipping_tax
			order.grand_total = sum_items_price_total + shipping_total; // subtotal + shipping_total + tax_included_total - (discount_total)
		}

		return order;
	}

	getEmailSubject(emailTemplate, order) {
		const subjectTemplate = handlebars.compile(emailTemplate.subject);
		return subjectTemplate(order);
	}

	getEmailBody(emailTemplate, order) {
		const bodyTemplate = handlebars.compile(emailTemplate.body);
		return bodyTemplate(order);
	}

	async sendAllMails(toEmail, copyTo, subject, body) {
		await Promise.all([
			mailer.send({
				to: toEmail,
				subject,
				html: body,
			}),
			mailer.send({
				to: copyTo,
				subject,
				html: body,
			}),
		]);
	}

	async checkoutOrder(orderId) {
		/*
    TODO:
    - check order exists
    - check order not placed
    - fire Webhooks
    */
		const [order, emailTemplate, dashboardSettings] = await Promise.all([
			this.getSingleOrder(orderId),
			EmailTemplatesService.getEmailTemplate('order_confirmation'),
			SettingsService.getSettings(),
		]);
		return TLorders.checkoutOrder(order).then((TLorder) => {
			const subject = this.getEmailSubject(emailTemplate, order);
			const body = this.getEmailBody(emailTemplate, order);
			const copyTo = dashboardSettings.order_confirmation_copy_to;

			dashboardWebSocket.send({
				event: dashboardWebSocket.events.ORDER_CREATED,
				payload: order,
			});

			return Promise.all([
				webhooks.trigger({
					event: webhooks.events.ORDER_CREATED,
					payload: order,
				}),
				this.updateOrder(orderId, { ...TLorder, draft: true }),
				// this.sendAllMails(order.email, copyTo, subject, body),
			]).then((result) => result[1]);
		});
	}

	cancelOrder(orderId) {
		const orderData = {
			cancelled: true,
			date_cancelled: new Date(),
		};

		return ProductStockService.handleCancelOrder(orderId).then(() => this.updateOrder(orderId, orderData));
	}

	closeOrder(orderId) {
		const orderData = {
			closed: true,
			date_closed: new Date(),
		};

		return this.updateOrder(orderId, orderData);
	}

	updateCustomerStatistics(customerId) {
		if (customerId) {
			return this.getOrders({ customer_id: customerId }).then((orders) => {
				let totalSpent = 0;
				let ordersCount = 0;

				if (orders.data && orders.data.length > 0) {
					for (const order of orders.data) {
						if (order.draft === false) {
							ordersCount++;
						}
						if (order.paid === true || order.closed === true) {
							totalSpent += order.grand_total;
						}
					}
				}

				return CustomersService.updateCustomerStatistics(customerId, totalSpent, ordersCount);
			});
		}
		return null;
	}

	async chargeOrder(orderId) {
		const order = await this.getSingleOrder(orderId);
		const isSuccess = await PaymentGateways.processOrderPayment(order);
		return isSuccess;
	}
}

export default new OrdersService();

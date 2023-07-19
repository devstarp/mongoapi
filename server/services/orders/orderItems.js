import { ObjectID } from 'mongodb';
import { db } from '../../lib/mongo';
import parse from '../../lib/parse';
import OrdersService from './orders';
import ProductsService from '../products/products';
import ProductStockService from '../products/stock';
import { apiGetTLProductItem } from '../../lib/TLapi';
import { apiGetShippingRates } from '../../lib/TLapi';
import { get, find } from 'lodash';

class OrderItemsService {
	constructor() {}

	async addItem(order_id, data) {
		if (!ObjectID.isValid(order_id)) {
			return Promise.reject('Invalid identifier');
		}
		let newItem = this.getValidDocumentForInsert(data);
		const orderItem = await this.getOrderItemIfExists(order_id, newItem.sku);
		if (orderItem) {
			await this.updateItemQuantityIfAvailable(order_id, orderItem, newItem);
		} else {
			await this.addNewItem(order_id, newItem);
		}
		return OrdersService.getSingleOrder(order_id);
	}

	async updateItemQuantityIfAvailable(order_id, orderItem, newItem) {
		const quantityNeeded = orderItem.quantity + newItem.quantity;
		const availableQuantity = await this.getAvailableProductQuantity(newItem.sku, quantityNeeded);

		if (availableQuantity > 0) {
			await this.updateItem(order_id, orderItem.id, {
				quantity: availableQuantity,
			});
		}
	}

	async addNewItem(order_id, newItem) {
		const orderObjectID = new ObjectID(order_id);
		const availableQuantity = await this.getAvailableProductQuantity(newItem.sku, newItem.quantity);

		if (availableQuantity > 0) {
			newItem.quantity = availableQuantity;
			await db.collection('orders').updateOne(
				{
					_id: orderObjectID,
				},
				{
					$push: {
						items: newItem,
					},
				}
			);

			await this.calculateAndUpdateItem(order_id, newItem.id);
			// here needs to api to items stock check
			// await ProductStockService.handleAddOrderItem(order_id, newItem.id);
		}
	}

	async getAvailableProductQuantity(sku, quantityNeeded) {
		const product = await ProductsService.getSingleProduct(sku.toString());
		if (!product) {
			return 0;
		} else {
			return product.available_quantity >= quantityNeeded ? quantityNeeded : product.available_quantity;
		}
	}

	async getOrderItemIfExists(order_id, sku) {
		let orderObjectID = new ObjectID(order_id);
		const order = await db.collection('orders').findOne(
			{
				_id: orderObjectID,
			},
			{
				items: 1,
			}
		);

		if (order && order.items && order.items.length > 0) {
			return order.items.find((item) => item.sku.toString() === sku.toString());
		} else {
			return null;
		}
	}

	async updateItem(order_id, item_id, data) {
		if (!ObjectID.isValid(order_id) || !ObjectID.isValid(item_id)) {
			return Promise.reject('Invalid identifier');
		}
		let orderObjectID = new ObjectID(order_id);
		let itemObjectID = new ObjectID(item_id);
		const item = this.getValidDocumentForUpdate(data);
		if (parse.getNumberIfPositive(data.quantity) === 0) {
			// delete item
			return this.deleteItem(order_id, item_id);
		} else {
			// update
			// await ProductStockService.handleDeleteOrderItem(order_id, item_id);
			await db.collection('orders').updateOne(
				{
					_id: orderObjectID,
					'items.id': itemObjectID,
				},
				{
					$set: item,
				}
			);

			await this.calculateAndUpdateItem(order_id, item_id);
			// await ProductStockService.handleAddOrderItem(order_id, item_id);
			return OrdersService.getSingleOrder(order_id);
		}
	}

	getVariantFromProduct(product, variantId) {
		if (product.variants && product.variants.length > 0) {
			return product.variants.find((variant) => variant.id.toString() === variantId.toString());
		} else {
			return null;
		}
	}

	getOptionFromProduct(product, optionId) {
		if (product.options && product.options.length > 0) {
			return product.options.find((item) => item.id.toString() === optionId.toString());
		} else {
			return null;
		}
	}

	getOptionValueFromProduct(product, optionId, valueId) {
		const option = this.getOptionFromProduct(product, optionId);
		if (option && option.values && option.values.length > 0) {
			return option.values.find((item) => item.id.toString() === valueId.toString());
		} else {
			return null;
		}
	}

	getOptionNameFromProduct(product, optionId) {
		const option = this.getOptionFromProduct(product, optionId);
		return option ? option.name : null;
	}

	getOptionValueNameFromProduct(product, optionId, valueId) {
		const value = this.getOptionValueFromProduct(product, optionId, valueId);
		return value ? value.name : null;
	}

	getVariantNameFromProduct(product, variantId) {
		const variant = this.getVariantFromProduct(product, variantId);
		if (variant) {
			let optionNames = [];
			for (const option of variant.options) {
				const optionName = this.getOptionNameFromProduct(product, option.option_id);
				const optionValueName = this.getOptionValueNameFromProduct(product, option.option_id, option.value_id);
				optionNames.push(`${optionName}: ${optionValueName}`);
			}
			return optionNames.join(', ');
		}

		return null;
	}

	async calculateAndUpdateItem(orderId, itemId) {
		// TODO: tax_total, discount_total

		const orderObjectID = new ObjectID(orderId);
		const itemObjectID = new ObjectID(itemId);

		const order = await OrdersService.getSingleOrder(orderId);

		if (order && order.items && order.items.length > 0) {
			const item = order.items.find((i) => i.id.toString() === itemId.toString());
			if (item) {
				const itemData = await this.getCalculatedData(item);
				await db.collection('orders').updateOne(
					{
						_id: orderObjectID,
						'items.id': itemObjectID,
					},
					{
						$set: itemData,
					}
				);
			}
			const shippingMethods = await this.getShippingRates(order);
			await db.collection('orders').updateOne(
				{
					_id: orderObjectID,
				},
				{
					$set: { shipping_methods: shippingMethods.response },
				}
			);
		}
	}

	async getCalculatedData(item) {
		const [product] = await ProductsService.getSingleProductItem({ sku: item.sku });
		if (item.custom_price && item.custom_price > 0) {
			// product with custom price - can set on client side
			return {
				'items.$.product_image': product.main_image,
				'items.$.sku': product.sku,
				'items.$.name': product.name,
				'items.$.code': product.product_code,
				'items.$.prices': item.custom_price,
				'items.$.discount_total': 0,
				'items.$.price_total': new Number(item.custom_price) * item.quantity,
			};
		} else {
			// normal product
			const productPrice = product.prices.list.special || product.prices.list.default;
			return {
				'items.$.product_image': product.main_image,
				'items.$.sku': product.sku,
				'items.$.name': product.name,
				'items.$.code': product.product_code,
				'items.$.prices': product.prices,
				'items.$.discount_total': 0,
				'items.$.price_total': new Number(productPrice) * item.quantity,
			};
		}
	}
	async checkAndUpdateItem(item, orderId) {
		const resItem = await apiGetTLProductItem(item.sku);
		if (resItem && !resItem.error) {
			await ProductsService.updateProduct(item.id, resItem.response);
			await this.updateItem(orderId, item.id, { out_of_stock: resItem.response.available_quantity === 0 });
		}
	}
	async calculateAndUpdateAllItems(order_id) {
		const order = await OrdersService.getSingleOrder(order_id);
		if (order && order.items) {
			for (const item of order.items) {
				await this.checkAndUpdateItem(item, order_id);
			}
			return OrdersService.getSingleOrder(order_id);
		} else {
			// order.items is empty
			return null;
		}
	}

	async deleteItem(order_id, item_id) {
		if (!ObjectID.isValid(order_id) || !ObjectID.isValid(item_id)) {
			return Promise.reject('Invalid identifier');
		}
		let orderObjectID = new ObjectID(order_id);
		let itemObjectID = new ObjectID(item_id);

		// await ProductStockService.handleDeleteOrderItem(order_id, item_id);
		await db.collection('orders').updateOne(
			{
				_id: orderObjectID,
			},
			{
				$pull: {
					items: {
						id: itemObjectID,
					},
				},
			}
		);

		return OrdersService.getSingleOrder(order_id);
	}
	getShippingRates = async (order) => {
		const data = {};
		data.iso_code_2 = get(order.shipping_address, 'country.code');
		data.state_code = get(order.shipping_address, 'state.code');
		// data.currency = settings.currency_code;
		data.products = order.items.map((item) => ({ sku: item.sku, quantity: item.quantity, gift: false }));
		if (data.iso_code_2 && data.state_code) {
			const shippingRates = await apiGetShippingRates(data);
			if (shippingRates && !shippingRates.error) {
				return shippingRates;
			}
			return null;
		}
		return null;
	};
	getValidDocumentForInsert(data) {
		const productImage = parse.getObjectIDIfValid(data.product_id);
		const item = {
			id: new ObjectID(data.id),
			sku: data.sku,
			quantity: parse.getNumberIfPositive(data.quantity) || 1,
		};

		if (data.custom_price) {
			item.custom_price = parse.getNumberIfPositive(data.custom_price);
		}

		if (data.custom_note) {
			item.custom_note = parse.getString(data.custom_note);
		}

		return item;
	}

	getValidDocumentForUpdate(data) {
		if (Object.keys(data).length === 0) {
			return new Error('Required fields are missing');
		}

		let item = {};

		if (data.sku !== undefined) {
			item['items.$.sku'] = parse.getString(data.sku);
		}

		if (data.quantity !== undefined) {
			item['items.$.quantity'] = parse.getNumberIfPositive(data.quantity);
		}

		if (data.product_code !== undefined) {
			item['items.$.code'] = parse.getString(data.product_code);
		}

		if (data.tax !== undefined) {
			item['items.$.tax'] = parse.getNumberIfPositive(data.tax);
		}
		if (data.unit_price !== undefined) {
			item['items.$.unit_price'] = parse.getNumberIfPositive(data.unit_price);
		}
		if (data.extra !== undefined) {
			item['items.$.extra'] = parse.getArrayIfValid(data.extra);
		}
		if (data.name !== undefined) {
			item['items.$.name'] = parse.getString(data.name);
		}

		if (data.out_of_stock !== undefined) {
			item['items.$.out_of_stock'] = parse.getBooleanIfValid(data.out_of_stock, false);
		}

		return item;
	}
}

export default new OrderItemsService();

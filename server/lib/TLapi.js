import { jsonQuery, query } from './commonAPI';

export async function apiGetTLProductItem(sku) {
	return await query(`/item-info`, { searchParams: { sku } });
}

export async function apiTLPlaceOrder(data) {
	return await jsonQuery(`/order`, 'POST', data);
}

export async function apiGetStates(iso_code_2) {
	return await query(`/states`, { searchParams: { iso_code_2 } });
}

export async function apiGetShippingRates(data) {
	return await jsonQuery(`/shipping-rate`, 'POST', data);
}

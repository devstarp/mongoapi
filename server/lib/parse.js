import { ObjectID } from 'mongodb';

const getString = (value) => (value || '').toString();
const getObject = (value) => {
	return typeof value === 'object' ? value : {};
};

const getDateIfValid = (value) => {
	const date = Date.parse(value);
	return isNaN(date) ? null : new Date(date);
};

const getArrayIfValid = (value) => {
	return Array.isArray(value) ? value : null;
};

const getArrayOfObjectID = (value) => {
	if (Array.isArray(value) && value.length > 0) {
		return value.map((id) => getObjectIDIfValid(id)).filter((id) => !!id);
	} else {
		return [];
	}
};

const isNumber = (value) => !isNaN(parseFloat(value)) && isFinite(value);

const getNumberIfValid = (value) => (isNumber(value) ? parseFloat(value) : null);

const getNumberIfPositive = (value) => {
	const n = getNumberIfValid(value);
	return n && n >= 0 ? n : null;
};

const getBoolNumberIfValid = (value, defaultValue = 0) => {
	if (value === 'true' || value === 'false') {
		return value === 'true' ? 1 : 0;
	} else if (typeof value === 'boolean') {
		return value ? 1 : 0;
	} else if (typeof value === 'number') {
		return value > 1 ? defaultValue : value;
	} else {
		return null;
	}
};
const getBooleanIfValid = (value, defaultValue = null) => {
	if (value === 'true' || value === 'false') {
		return value === 'true';
	} else {
		return typeof value === 'boolean' ? value : defaultValue;
	}
};

const getObjectIDIfValid = (value) => {
	return ObjectID.isValid(value) ? new ObjectID(value) : null;
};

const getBrowser = (browser) => {
	return browser
		? {
				ip: getString(browser.ip),
				user_agent: getString(browser.user_agent),
		  }
		: {
				ip: '',
				user_agent: '',
		  };
};

const getAddress = (address) => {
	let coordinates = {
		latitude: '',
		longitude: '',
	};

	if (address && address.coordinates) {
		coordinates.latitude = address.coordinates.latitude;
		coordinates.longitude = address.coordinates.longitude;
	}
	return address
		? {
				id: new ObjectID(),
				first_name: getString(address.first_name),
				last_name: getString(address.last_name),
				address1: getString(address.address1),
				address2: getString(address.address2),
				city: getString(address.city),
				country: getObject(address.country),
				postal_code: getString(address.postal_code),
				state: getObject(address.state),
				phone: getString(address.phone),
				company: getString(address.company),
				tax_number: getString(address.tax_number),
				coordinates: coordinates,
				details: address.details,
				default_billing: getBooleanIfValid(address.default_billing),
				default_shipping: getBooleanIfValid(address.default_shipping),
		  }
		: {};
};

// const getOrderAddress = (address) => {
// 	let coordinates = {
// 		latitude: '',
// 		longitude: '',
// 	};

// 	if (address && address.coordinates) {
// 		coordinates.latitude = address.coordinates.latitude;
// 		coordinates.longitude = address.coordinates.longitude;
// 	}

// 	const emptyAddress = {
// 		full_name: '',
// 		address1: '',
// 		address2: '',
// 		city: '',
// 		country: '',
// 		postal_code: '',
// 		state: '',
// 		phone: '',
// 		company: '',
// 		tax_number: '',
// 		coordinates: coordinates,
// 		details: null,
// 	};

// 	return address
// 		? Object.assign(
// 				{},
// 				{
// 					full_name: getString(address.full_name),
// 					address1: getString(address.address1),
// 					address2: getString(address.address2),
// 					city: getString(address.city),
// 					country: getString(address.country).toUpperCase(),
// 					postal_code: getString(address.postal_code),
// 					state: getString(address.state),
// 					phone: getString(address.phone),
// 					company: getString(address.company),
// 					tax_number: getString(address.tax_number),
// 					coordinates: coordinates,
// 					details: address.details,
// 				},
// 				address
// 		  )
// 		: emptyAddress;
// };

export default {
	getString: getString,
	getObject: getObject,
	getBoolNumberIfValid: getBoolNumberIfValid,
	getObjectIDIfValid: getObjectIDIfValid,
	getDateIfValid: getDateIfValid,
	getArrayIfValid: getArrayIfValid,
	getArrayOfObjectID: getArrayOfObjectID,
	getNumberIfValid: getNumberIfValid,
	getNumberIfPositive: getNumberIfPositive,
	getBooleanIfValid: getBooleanIfValid,
	getBrowser: getBrowser,
	getCustomerAddress: getAddress,
	getOrderAddress: getAddress,
};

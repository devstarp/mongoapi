import express from 'express';
import jwt from 'jsonwebtoken';
import { ObjectID } from 'mongodb';
import CezerinClient from 'cezerin2-client';
import handlebars from 'handlebars';
import bcrypt from 'bcrypt';
import serverSettings from './lib/settings';
import { db } from './lib/mongo';
import AuthHeader from './lib/auth-header';
import mailer from './lib/mailer';
import EmailTemplatesService from './services/settings/emailTemplates';
import SettingsService from './services/settings/settings';
import { get, first } from 'lodash';
import createInvoice from './lib/createInvoice';
import { apiGetStates } from './lib/TLapi';
import paypal from '@paypal/checkout-server-sdk';
import paypalClient from './lib/paypalClient';
// cost factor for hashes
const { saltRounds } = serverSettings;

const ajaxRouter = express.Router();
const TOKEN_PAYLOAD = { email: 'store', scopes: ['admin'] };
const STORE_ACCESS_TOKEN = jwt.sign(TOKEN_PAYLOAD, serverSettings.jwtSecretKey);

const api = new CezerinClient({
	apiBaseUrl: serverSettings.apiBaseUrl,
	apiToken: STORE_ACCESS_TOKEN,
});

const DEFAULT_CACHE_CONTROL = 'public, max-age=60';
const PRODUCTS_CACHE_CONTROL = 'public, max-age=60';
const PRODUCT_DETAILS_CACHE_CONTROL = 'public, max-age=60';

const getCookieOptions = (isHttps) => ({
	maxAge: 24 * 60 * 60 * 1000, // 24 hours
	httpOnly: true,
	signed: true,
	secure: isHttps,
	sameSite: 'strict',
});

const getIP = (req) => {
	let ip = req.get('x-forwarded-for') || req.ip;

	if (ip && ip.includes(', ')) {
		ip = ip.split(', ')[0];
	}

	if (ip && ip.includes('::ffff:')) {
		ip = ip.replace('::ffff:', '');
	}

	return ip;
};

const getUserAgent = (req) => req.get('user-agent');

const fillCartItemWithProductData = (products, cartItem) => {
	if (!products || products.length === 0) return;
	const product = products.find((p) => p.sku === cartItem.sku);
	if (product) {
		cartItem.path = product.path;
		cartItem.saleable = product.saleable;
		cartItem.code = product.product_code;
		cartItem.color = product.color;
		cartItem.available_quantity = product.available_quantity;
	}
	return cartItem;
};

const fillCartItems = (cartResponse) => {
	const cart = get(cartResponse, 'json');
	if (!cart) return cartResponse;
	if (cart && cart.items && cart.items.length > 0) {
		const skus = cart.items.map((item) => item.sku);
		return api.products
			.list({
				sku: skus.join(','),
				according_sku: true,
				fields: 'main_image,available_quantity,path,on_sale,sale_price,regular_price,prices',
			})
			.then(async ({ status, json }) => {
				const newCartItems = cart.items.map((cartItem) => fillCartItemWithProductData(json.data, cartItem));
				cartResponse.json.items = newCartItems;
				return cartResponse;
			});
	}
	return Promise.resolve(cartResponse);
};

ajaxRouter.get('/products', (req, res) => {
	const filter = req.query;
	filter.enabled = true;
	api.products
		.list(filter)
		.then(({ status, json }) => res.status(status).header('Cache-Control', PRODUCTS_CACHE_CONTROL).send(json));
});

ajaxRouter.get('/products/:id', (req, res) => {
	api.products
		.retrieve(req.params.id)
		.then(({ status, json }) => res.status(status).header('Cache-Control', PRODUCT_DETAILS_CACHE_CONTROL).send(json));
});

ajaxRouter.post('/reset-password', async (req, res, next) => {
	await bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
		const data = {
			status: false,
			id: null,
			verified: false,
		};

		const userId =
			'token' in req.body
				? AuthHeader.decodeUserLoginAuth(req.body.token)
				: AuthHeader.decodeUserLoginAuth(req.body.id).userId.userId;

		const filter = {
			id: userId,
		};
		const customerDraft = {
			password: hash,
		};

		// update customer password after checking customer id
		if ('id' in req.body) {
			await api.customers.update(userId, customerDraft).then(({ status, json }) => {
				data.status = true;
				data.id = userId;
				data.verified = true;
				return res.status(status).send(data);
			});
			return false;
		}

		if ('name' in userId && userId.name.indexOf('JsonWebTokenErro') !== -1) {
			res.send(data);
			return false;
		}

		// if customer email exists send status back
		const { status, json } = await api.customers.list(filter);
		if (json.total_count > 0) {
			data.status = true;
			data.id = AuthHeader.encodeUserLoginAuth(userId);
		}
		return res.status(status).send(data);
	});
});

ajaxRouter.post('/forgot-password', async (req, res, next) => {
	const filter = {
		email: req.body.email.toLowerCase(),
	};
	const data = {
		status: true,
	};

	// send forgot password email
	async function sendEmail(userId) {
		const countryCode = undefined;
		const [emailTemp] = await Promise.all([
			EmailTemplatesService.getEmailTemplate(`forgot_password_${serverSettings.language}`),
		]);
		await handlebars.registerHelper('forgot_password_link', (obj) => {
			const url = `${serverSettings.storeBaseUrl}${
				countryCode !== undefined ? `/${countryCode}/` : '/'
			}reset-password?token=${AuthHeader.encodeUserLoginAuth(userId)}`;
			let text = emailTemp.link;
			if (text == undefined) {
				text = url;
			}
			return new handlebars.SafeString(
				`<a style="position: relative;text-transform: uppercase;border: 1px solid #ccc;color: #000;padding: 5px;text-decoration: none;" value="${text}" href="${url}"> ${text} </a>`
			);
		});
		const [bodyTemplate, settings] = await Promise.all([
			handlebars.compile(emailTemp.body),
			SettingsService.getSettings(),
		]);
		await Promise.all([
			mailer.send({
				to: req.body.email,
				subject: `${emailTemp.subject} ${settings.store_name}`,
				html: bodyTemplate({
					shop_name: settings.store_name,
				}),
			}),
			res.send(data),
		]);
	}

	// check if customer exists
	await api.customers.list(filter).then(({ status, json }) => {
		if (json.total_count < 1) {
			data.status = false;
			res.status(status).send(data);
			return false;
		}
		sendEmail(json.data[0].id);
	});
});

ajaxRouter.post('/customer-account', async (req, res, next) => {
	const customerData = {
		token: '',
		authenticated: false,
		customer_settings: null,
		order_statuses: null,
	};

	if (req.body.token) {
		customerData.token = AuthHeader.decodeUserLoginAuth(req.body.token);
		if (customerData.token.userId !== undefined) {
			let userId = null;
			try {
				userId = JSON.stringify(customerData.token.userId).replace(/["']/g, '');
			} catch (erro) {}

			const filter = {
				customer_id: userId,
				draft: false,
			};

			// retrieve customer data
			await api.customers.retrieve(userId).then(({ status, json }) => {
				customerData.customer_settings = json;
				customerData.customer_settings.password = '*******';
				customerData.token = AuthHeader.encodeUserLoginAuth(userId);
				customerData.authenticated = false;
			});

			// retrieve orders data
			await api.orders.list(filter).then(({ status, json }) => {
				customerData.order_statuses = json;

				return res.status(status).send(JSON.stringify(customerData));
			});
		}
	}
});

ajaxRouter.post('/login', async (req, res, next) => {
	const isHttps = req.protocol === 'https';
	const AUTH_COOKIE_OPTIONS = getCookieOptions(isHttps);
	const customerData = {
		token: '',
		authenticated: false,
		loggedin_failed: false,
		customer_settings: null,
		order_statuses: null,
		cartLayer: req.body.cartLayer !== undefined ? req.body.cartLayer : false,
	};
	// check if customer exists in database and grant or denie access
	await db
		.collection('customers')
		.find({ email: req.body.email.toLowerCase() })
		.limit(1)
		.next((error, result) => {
			if (error) {
				// alert
				throw error;
			}
			if (!result) {
				api.customers.list().then(({ status, json }) => {
					customerData.loggedin_failed = true;
					return res.status(status).send(JSON.stringify(customerData));
				});
				return;
			}

			const customerPassword = result.password;
			const inputPassword = AuthHeader.decodeUserPassword(req.body.password).password;

			bcrypt.compare(inputPassword, customerPassword, async (err, out) => {
				if (out == true) {
					customerData.token = AuthHeader.encodeUserLoginAuth(result._id);
					customerData.authenticated = true;

					await api.customers.retrieve(result._id).then(({ status, json }) => {
						customerData.customer_settings = json;
						customerData.customer_settings.password = '*******';

						const filter = {
							customer_id: json.id,
							draft: false,
						};
						api.orders.list(filter).then(({ status, json }) => {
							customerData.order_statuses = json;

							res.cookie('auth_token', customerData.token, AUTH_COOKIE_OPTIONS);
							return res.status(status).send(JSON.stringify(customerData));
						});
					});
					return true;
				}
				customerData.loggedin_failed = true;
				res.status(200).send(JSON.stringify(customerData));
			});
		});
});
ajaxRouter.post('/logout', async (req, res, next) => {
	res.clearCookie('order_id');
	res.clearCookie('auth_token');
	res.status(200).send({});
});
ajaxRouter.post('/register', async (req, res, next) => {
	// set data for response
	const data = {
		status: false,
		isRightToken: true,
		isCustomerSaved: false,
	};
	const filter = {
		email: req.body.email,
	};

	// check if url params contains token
	const requestToken = 'token' in req.body ? req.body.token : false;

	if (requestToken && !data.status) {
		const requestTokenArray = requestToken.split('xXx');

		// if requestToken array has no splitable part response token is wrong
		if (requestTokenArray.length < 2) {
			data.isRightToken = false;
			res.status('200').send(data);
			return false;
		}

		(async () => {
			// decode token parts and check if valid email is the second part of them
			const firstName = await AuthHeader.decodeUserLoginAuth(requestTokenArray[0]).userId;
			const lastName = await AuthHeader.decodeUserLoginAuth(requestTokenArray[1]).userId;
			const eMail = await AuthHeader.decodeUserLoginAuth(requestTokenArray[2]).userId;
			const passWord = await AuthHeader.decodeUserPassword(requestTokenArray[3]).password;

			if (
				requestTokenArray.length < 1 ||
				!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
					eMail
				)
			) {
				data.isRightToken = false;
				res.status('200').send(data);
				return false;
			}

			// check once if customer email is existig in database
			filter.email = eMail;
			await api.customers
				.list(filter)
				.then(({ status, json }) => {
					if (json.total_count > 0) {
						data.isCustomerSaved = true;
						return false;
					}
				})
				.catch((error) => {
					console.log(error);
				});
			// generate password-hash
			const salt = bcrypt.genSaltSync(saltRounds);
			const hashPassword = bcrypt.hashSync(passWord, salt);

			const customerDraft = {
				full_name: `${firstName} ${lastName}`,
				first_name: firstName,
				last_name: lastName,
				email: eMail.toLowerCase(),
				password: hashPassword,
			};

			// create new customer in database
			await api.customers.create(customerDraft).catch((error) => {
				console.log(error);
			});
		})();
		data.isCustomerSaved = true;
		res.status('200').send(data);
		return true;
	}

	// send customer a doi email
	async function registerCustomer() {
		if (data.status) {
			const countryCode = undefined;
			const [emailTemp] = await Promise.all([
				EmailTemplatesService.getEmailTemplate(`register_doi_${serverSettings.language}`),
			]);
			await handlebars.registerHelper('register_doi_link', (obj) => {
				const url = `${serverSettings.storeBaseUrl}${
					countryCode !== undefined ? `/${countryCode}/` : '/'
				}register?token=${tokenConcatString}`;
				let text = emailTemp.link;
				if (text == undefined) {
					text = url;
				}
				return new handlebars.SafeString(
					`<a style="position: relative;text-transform: uppercase;border: 1px solid #ccc;color: #000;padding: 5px;text-decoration: none;" value="${text}" href="${url}"> ${text} </a>`
				);
			});
			const [bodyTemplate, settings] = await Promise.all([
				handlebars.compile(emailTemp.body),
				SettingsService.getSettings(),
			]);
			const tokenConcatString = `${AuthHeader.encodeUserLoginAuth(
				req.body.first_name
			)}xXx${AuthHeader.encodeUserLoginAuth(req.body.last_name)}xXx${AuthHeader.encodeUserLoginAuth(
				req.body.email
			)}xXx${req.body.password}`;
			await Promise.all([
				mailer.send({
					to: req.body.email,
					subject: `${emailTemp.subject} ${settings.store_name}`,
					html: bodyTemplate({
						shop_name: settings.store_name,
					}),
				}),
				res.status('200').send(data),
			]);
		}
		return false;
	}
	// check if customer exist in database
	if (!requestToken) {
		await api.customers
			.list(filter)
			.then(({ status, json }) => {
				if (json.total_count > 0) {
					res.status(status).send(data);
					return false;
				}
				data.status = true;
				registerCustomer();
			})
			.catch((error) => {
				console.log(error);
			});
	}
});
const changeDefaultCustomerAddress = async (address, userId) => {
	switch (address.type) {
		case 'shipping':
			return await api.customers.setDefaultShippingAddress(userId, address.id);
		case 'billing':
			return await api.customers.setDefaultBillingAddress(userId, address.id);
		default:
			return;
	}
};
const changeCustomerAddress = async (userId, address, _delete) => {
	if (address.id) {
		if (_delete) {
			return await api.customers.deleteAddress(userId, address.id);
		} else {
			return await api.customers.updateAddress(userId, address.id, address);
		}
	} else {
		return await api.customers.createAddress(userId, address);
	}
};
ajaxRouter.put('/customer-account', async (req, res, next) => {
	const customerData = req.body;
	const token = AuthHeader.decodeUserLoginAuth(req.body.token);
	const userId = JSON.stringify(token.userId).replace(/["']/g, '');

	// setup objects and filter
	const customerDataObj = {
		token: '',
		authenticated: false,
		customer_settings: null,
		order_statuses: null,
	};
	const customerDraftObj = {
		first_name: customerData.first_name,
		last_name: customerData.last_name,
		phone: customerData.phone,
		gender: customerData.gender,
		email: customerData.email,
	};
	const filter = {
		customer_id: userId,
		draft: false,
	};

	if (customerData.changeAddress) {
		Promise.all([
			changeCustomerAddress(userId, customerData.address, customerData.deleteAddress),
			changeDefaultCustomerAddress(customerData.address, userId),
		])
			.then(() => {
				api.customers
					.retrieve(userId)
					.then(({ status, json }) => {
						customerDataObj.customer_settings = json;
						customerDataObj.customer_settings.password = '*******';
						customerDataObj.token = AuthHeader.encodeUserLoginAuth(userId);
						customerDataObj.authenticated = true;
						api.orders.list(filter).then(({ status, json }) => {
							customerDataObj.order_statuses = json;
							return res.status(status).send(JSON.stringify(customerDataObj));
						});
					})
					.catch();
			})
			.catch();
	} else {
		await api.customers.update(userId, customerDraftObj).then(({ status, json }) => {
			customerDataObj.customer_settings = json;
			customerDataObj.customer_settings.password = '*******';
			customerDataObj.token = AuthHeader.encodeUserLoginAuth(userId);
			customerDataObj.authenticated = true;
			api.orders.list(filter).then(({ status, json }) => {
				customerData.order_statuses = json;
				return res.status(status).send(JSON.stringify(customerData));
			});
		});
	}
});
ajaxRouter.post('/customer-account/:customer_id/addresses/', async (req, res, next) => {
	const address = req.body;
	const customer_id = req.params.customer_id;
	Promise.all([api.customers.createAddress(customer_id, address), changeDefaultCustomerAddress(address, customer_id)])
		.then(() => {
			api.customers
				.retrieve(userId)
				.then(({ status, json }) => {
					res.status(status).send(JSON.stringify(json.addresses));
				})
				.catch();
		})
		.catch();
});
ajaxRouter.put('/customer-account/:customer_id/addresses/:address_id', async (req, res, next) => {
	const address = req.body;
	const customer_id = req.params.customer_id;
	const address_id = req.params.address_id;
	Promise.all([
		api.customers.updateAddress(customer_id, address_id, address),
		changeDefaultCustomerAddress(address, customer_id),
	])
		.then(() => {
			api.customers
				.retrieve(userId)
				.then(({ status, json }) => {
					res.status(status).send(JSON.stringify(json.addresses));
				})
				.catch();
		})
		.catch();
});
ajaxRouter.delete('/customer-account/:customer_id/addresses/:address_id', async (req, res, next) => {
	const address = req.body;
	const customer_id = req.params.customer_id;
	const address_id = req.params.address_id;
	api.customers
		.deleteAddress(customer_id, address_id)
		.then(() => {
			api.customers
				.retrieve(userId)
				.then(({ status, json }) => {
					res.status(status).send(JSON.stringify(json.addresses));
				})
				.catch();
		})
		.catch();
});
ajaxRouter.get('/customer-account/address/:country_code/states', async (req, res, next) => {
	const country_code = req.params.country_code;
	const resStates = await apiGetStates(country_code);
	if (resStates && !resStates.error) {
		res.status(resStates.status).send(resStates.states);
	}
});

ajaxRouter.get('/cart/:token', (req, res) => {
	// const { order_id } = req.signedCookies;
	const customer_id = 'token' in req.params ? AuthHeader.decodeUserLoginAuth(req.params.token).userId : null;
	if (customer_id) {
		api.orders
			.list({ customer_id, draft: true })
			.then((cartResponse) => fillCartItems({ ...cartResponse, json: first(get(cartResponse, 'json.data')) || {} }))
			.then(({ status, json }) => {
				json.browser = undefined;
				const isHttps = req.protocol === 'https';
				const CART_COOKIE_OPTIONS = getCookieOptions(isHttps);
				res.cookie('order_id', json.id, CART_COOKIE_OPTIONS);
				return res.status(status).send(json);
			});
	} else {
		return res.end();
	}
});

ajaxRouter.post('/cart/items', (req, res, next) => {
	const isHttps = req.protocol === 'https';
	const CART_COOKIE_OPTIONS = getCookieOptions(isHttps);
	const { order_id, auth_token } = req.signedCookies;
	const item = req.body;
	const { userId: customer_id } = AuthHeader.decodeUserLoginAuth(req.body.token);
	if (order_id) {
		api.orders.items
			.create(order_id, item)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		const orderDraft = {
			draft: true,
			referrer_url: req.signedCookies.referrer_url,
			landing_url: req.signedCookies.landing_url,
			customer_id,
			browser: {
				ip: getIP(req),
				user_agent: getUserAgent(req),
			},
		};
		api.customers
			.retrieve(customer_id)
			.then(({ status, json }) => {
				orderDraft.shipping_address = json.shipping;
				orderDraft.billing_address = json.billing;
				return orderDraft;
			})
			.then((orderDraft) => {
				api.orders.create(orderDraft).then((orderResponse) => {
					const orderId = orderResponse.json.id;

					res.cookie('order_id', orderId, CART_COOKIE_OPTIONS);
					api.orders.items
						.create(orderId, { ...item, customer_id })
						.then((cartResponse) => fillCartItems(cartResponse))
						.then(({ status, json }) => {
							res.status(status).send(json);
						});
				});
			});
	}
});

ajaxRouter.delete('/cart/items/:item_id', (req, res, next) => {
	const { order_id } = req.signedCookies;
	const { item_id } = req.params;
	if (order_id && item_id) {
		api.orders.items
			.delete(order_id, item_id)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});

ajaxRouter.put('/cart/items/:item_id', (req, res, next) => {
	const { order_id } = req.signedCookies;
	const { item_id } = req.params;
	const item = req.body;
	if (order_id && item_id) {
		api.orders.items
			.update(order_id, item_id, item)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});

ajaxRouter.put('/cart/checkout', (req, res, next) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		api.orders
			.checkout(order_id)
			// .then((cartResponse) => fillCartItems({ json: cartResponse }))
			.then(({ status, json }) => {
				console.log(json);
				let paths = '';
				// generate pdp landing url for the ordered product. More than 1 product in ordered will return comma separated url.
				[].slice.call(json.items).forEach((items) => {
					paths +=
						json.items.length < 2
							? `${serverSettings.storeBaseUrl}${items.path}`
							: `${serverSettings.storeBaseUrl}${items.path},`;
				});
				const invoice_number = new Date().valueOf();
				createInvoice({ ...json, invoice_number }, `./public/invoices/${invoice_number}.pdf`);
				const data = {
					landing_url: paths,
					invoice: `/public/invoices/${invoice_number}.pdf`,
				};
				api.orders.update(order_id, data);
				// res.clearCookie('order_id');
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});

ajaxRouter.put('/cart', async (req, res) => {
	const cartData = req.body;
	const { shipping_address: shippingAddress, billing_address: billingAddress } = cartData;
	const orderId = req.signedCookies.order_id;
	if (orderId) {
		if (shippingAddress) {
			await api.orders.updateShippingAddress(orderId, shippingAddress);
		}
		if (billingAddress) {
			await api.orders.updateBillingAddress(orderId, billingAddress);
		}
		await api.orders
			.update(orderId, cartData)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});

ajaxRouter.put('/cart/shipping_address', (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		api.orders
			.updateShippingAddress(order_id, req.body)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});

ajaxRouter.put('/cart/check_items', (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		api.orders
			.recalculate(order_id)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});
ajaxRouter.put('/cart/billing_address', (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		api.orders
			.updateBillingAddress(order_id, req.body)
			.then((cartResponse) => fillCartItems(cartResponse))
			.then(({ status, json }) => {
				res.status(status).send(json);
			});
	} else {
		res.end();
	}
});

ajaxRouter.get('/cart/checkout/paypal/setup', async (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		api.orders.getPaymentFormSettings(order_id).then((options) => {
			const request = new paypal.orders.OrdersCreateRequest();
			request.prefer('return=representation');
			request.requestBody({
				intent: 'CAPTURE',
				purchase_units: [
					{
						amount: {
							currency_code: options.currency,
							value: options.amount,
						},
					},
				],
			});
			paypalClient
				.client(options.gatewaySettings.client_id, options.gatewaySettings.client_secret)
				.execute(request)
				.then((order) => {
					return res.status(200).json({
						orderID: order.result.id,
					});
				})
				.catch((err) => {
					console.error(err);
					return res.send(500);
				});
		});
	} else {
		res.end();
	}
});

ajaxRouter.get('/cart/checkout/paypal/capture', async (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		const orderID = req.body.orderID;
		const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
		request.requestBody({});
		try {
			const capture = await paypalClient.client().execute(request);
			const captureID = capture.result.purchase_units[0].payments.captures[0].id;
		} catch (err) {
			console.error(err);
			return res.send(500);
		}
		res.send(200).send({ success: true });
	} else {
		res.end();
	}
});
ajaxRouter.post('/cart/charge', async (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		const { client } = api.orders;
		const chargeResponse = await client.post(`/orders/${order_id}/charge`);
		res.status(chargeResponse.status).send(chargeResponse.json);
	} else {
		res.end();
	}
});

ajaxRouter.get('/pages', (req, res) => {
	api.pages.list(req.query).then(({ status, json }) => {
		res.status(status).header('Cache-Control', DEFAULT_CACHE_CONTROL).send(json);
	});
});

ajaxRouter.get('/pages/:id', (req, res) => {
	api.pages.retrieve(req.params.id).then(({ status, json }) => {
		res.status(status).header('Cache-Control', DEFAULT_CACHE_CONTROL).send(json);
	});
});

ajaxRouter.get('/sitemap', async (req, res) => {
	let result = null;
	const filter = req.query;
	filter.enabled = true;

	const sitemapResponse = await api.sitemap.retrieve(req.query);
	if (sitemapResponse.status !== 404 || sitemapResponse.json) {
		result = sitemapResponse.json;

		if (result.type === 'product') {
			const productResponse = await api.products.retrieve(result.resource);
			result.data = productResponse.json;
		} else if (result.type === 'page') {
			const pageResponse = await api.pages.retrieve(result.resource);
			result.data = pageResponse.json;
		}
	}

	res.status(sitemapResponse.status).header('Cache-Control', DEFAULT_CACHE_CONTROL).send(result);
});

ajaxRouter.get('/payment_methods', (req, res) => {
	const filter = {
		enabled: true,
		order_id: req.signedCookies.order_id,
	};
	api.paymentMethods.list(filter).then(({ status, json }) => {
		const methods = json.map((item) => {
			delete item.conditions;
			return item;
		});

		res.status(status).send(methods);
	});
});

ajaxRouter.get('/shipping_methods', (req, res) => {
	const filter = {
		enabled: true,
		order_id: req.signedCookies.order_id,
	};
	api.shippingMethods.list(filter).then(({ status, json }) => {
		res.status(status).send(json);
	});
});

ajaxRouter.get('/payment_form_settings', (req, res) => {
	const { order_id } = req.signedCookies;
	if (order_id) {
		api.orders.getPaymentFormSettings(order_id).then(({ status, json }) => {
			res.status(status).send(json);
		});
	} else {
		res.end();
	}
});

export default ajaxRouter;

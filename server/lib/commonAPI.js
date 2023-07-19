import axios from 'axios';

export async function fetch(url, options) {
	const request = {
		method: options.method ? options.method : 'GET',
		url,
		headers: options.headers,
		data: options.data,
	};
	return axios(request)
		.then((response) => response)
		.catch((err) => Promise.reject(err));
}

const getUrl = function (path, params = {}) {
	const url = new URL(`https://stage.tuscanyleather.it/api/v1${path}`);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.append(String(key), String(value));
	}
	return url.toString();
};
export const query = async function (path, options = {}, useToken = true) {
	let res = null;
	if (!options.headers) {
		options.headers = {
			Accept: 'application/json',
		};
	}
	options.headers = options.headers || {};
	const userInfo = useToken
		? 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3d3dy50dXNjYW55bGVhdGhlci5pdC9yZWZyZXNoLWFwaS10b2tlbiIsImlhdCI6MTYwMzc1OTYyOSwiZXhwIjoxOTE5MTE5NjI5LCJuYmYiOjE2MDM3NTk2MjksImp0aSI6IkdFZHBtc3hrYUdYazlMOXgiLCJzdWIiOjE3NTQ4NiwicHJ2IjoiMGU2NWZlY2FjNDUyOTNkOGZkZmM1YjMwZjEwOGQ0MDVmMGE1Y2RiNiJ9.spW9ie6f4Ie_EIPrfEUJq0eXGY_z6JwSZi-m2rxuFX8'
		: null;
	const token =
		'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3d3dy50dXNjYW55bGVhdGhlci5pdC9yZWZyZXNoLWFwaS10b2tlbiIsImlhdCI6MTYwMzc1OTYyOSwiZXhwIjoxOTE5MTE5NjI5LCJuYmYiOjE2MDM3NTk2MjksImp0aSI6IkdFZHBtc3hrYUdYazlMOXgiLCJzdWIiOjE3NTQ4NiwicHJ2IjoiMGU2NWZlY2FjNDUyOTNkOGZkZmM1YjMwZjEwOGQ0MDVmMGE1Y2RiNiJ9.spW9ie6f4Ie_EIPrfEUJq0eXGY_z6JwSZi-m2rxuFX8';
	// const token = userInfo && userInfo.token;
	if (token) {
		options.headers.Authorization = `Bearer ${token}`;
	}
	const url = getUrl(path, options.searchParams || {});
	try {
		const response = await fetch(url, options);
		if (response.status >= 200 && response.status < 300) {
			if (options && options.responseType === 'blob') {
				res = response;
			} else {
				res = response.data;
			}
			if (res.success) {
				return { ...res, status: response.status };
			}
			return { status: response.status, error: res.error };
		}
		return null;
	} catch (error) {
		const errorResponse = error.response;
		let status = 408;
		let errorMessage = null;
		if (errorResponse === undefined || !errorResponse) {
			errorMessage = 'Network error';
		} else if (errorResponse.status >= 500) {
			status = errorResponse.status;
			errorMessage = errorResponse.data.error || 'Failed by server error.';
		} else if (errorResponse.status === 400) {
			status = errorResponse.status;
			errorMessage = errorResponse.data.error;
		} else if (errorResponse.status === 401) {
			status = errorResponse.status;
			errorMessage = errorResponse.data.error || 'Authentication was failed. Please login with your credetial, again.';
		} else {
			status = errorResponse.status;
			errorMessage = errorResponse.data.error === undefined ? 'Unknow Error' : errorResponse.data.error;
		}
		return { status, error: errorMessage };
	}
};

export const jsonQuery = async function (path, method, data, useToken = true) {
	return await query(
		path,
		{
			method,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			data,
		},
		useToken
	);
};

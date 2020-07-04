import Axios, { AxiosError, AxiosResponse } from 'axios';
import i18next from 'i18next';

import { displayMessage } from './components/tools';

Axios.defaults.baseURL = '/api';

Axios.interceptors.response.use((response: AxiosResponse<{ code: string, data: any }>) => {
	// Any status code that lie within the range of 2xx cause this function to trigger
	// Do something with response data
	if (response.data.code && typeof response.data.data !== 'object') {
		displayMessage('success', i18next.t(`SUCCESS_CODES.${response.data.code}`, {data: response.data.data}));
	}
	return response;
}, (err: AxiosError<{ code: string, data: any }>) => {
	// Any status codes that falls outside the range of 2xx cause this function to trigger
	// Do something with response error
	if (err.response && err.response.data.code && typeof err.response.data.data !== 'object') {
		displayMessage('error', i18next.t(`ERROR_CODES.${err.response.data.code}`, {data: err.response.data.data}));
	}
	return Promise.reject(err);
});

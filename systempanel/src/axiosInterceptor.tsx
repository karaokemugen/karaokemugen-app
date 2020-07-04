import Axios, { AxiosError, AxiosResponse } from 'axios';
import i18next from 'i18next';
import { useContext } from 'react';

import { socket } from './App';
import { errorMessage, infoMessage,loading } from './store/actions/navigation';
import GlobalContext from './store/context';

Axios.defaults.baseURL = '/api';

let instance;

function StartAxios() {
	const globalDispatch = useContext(GlobalContext).globalDispatch;

	socket.on('error', (err) => {
		globalDispatch(errorMessage(i18next.t(`ERROR_CODES.${err.code}`, {repo: err.data?.repo.Name, err: err.data.err})));
	});

	Axios.interceptors.response.use((response: AxiosResponse<{ code: string, data: any }>) => {
		// Any status code that lie within the range of 2xx cause this function to trigger
		// Do something with response data
		if (response.data.code && typeof response.data.data !== 'object') {
			globalDispatch(infoMessage(i18next.t(`SUCCESS_CODES.${response.data.code}`, {data: response.data.data})));
		}
		return response;
	}, (err: AxiosError<{ code: string, data: any }>) => {
		// Any status codes that falls outside the range of 2xx cause this function to trigger
		// Do something with response error
		if (err.response && typeof err.response.data.data !== 'object') {
			globalDispatch(errorMessage(i18next.t(`ERROR_CODES.${err.response.data.code}`, {data: err.response.data.data})));
		}
		return Promise.reject(err);
	});

	instance = Axios.create();

	// Add a request interceptor
	instance.interceptors.request.use((config) => {
		// Do something before request is sent
		globalDispatch(loading(true));
		return config;
	});

	instance.interceptors.response.use((response: AxiosResponse<{ code: string, data: any }>) => {
		// Any status code that lie within the range of 2xx cause this function to trigger
		// Do something with response data
		globalDispatch(loading(false));
		if (response.data.code && typeof response.data.data !== 'object') {
			globalDispatch(infoMessage(i18next.t(`SUCCESS_CODES.${response.data.code}`, {data: response.data.data})));
		}
		return response;
	}, (err: AxiosError<{ code: string, data: any }>) => {
		// Any status codes that falls outside the range of 2xx cause this function to trigger
		// Do something with response error
		globalDispatch(loading(false));
		if (err.response && typeof err.response.data.data !== 'object') {
			globalDispatch(errorMessage(i18next.t(`ERROR_CODES.${err.response.data.code}`, {data: err.response.data.data})));
		}
		return Promise.reject(err);
	});
	return null;
}

export function getAxiosInstance() {
	return instance;
}

export default StartAxios;
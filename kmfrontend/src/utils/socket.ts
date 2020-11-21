import i18next from 'i18next';
import { io } from 'socket.io-client';

import { displayMessage, eventEmitter } from './tools';

const socket = io();
let authorization;
let onlineAuthorization;

export function setAuthorization(authorizationParam:string, onlineAuthorizationParam:string) {
	authorization = authorizationParam;
	if (!authorizationParam || onlineAuthorizationParam) onlineAuthorization = onlineAuthorizationParam;
}

export function commandBackend(name: string, body?: any, loading = false, timeout = 5000): Promise<any> {
	return new Promise((resolve, reject) => {
		if (loading) eventEmitter.emitChange('loading', true);
		const nodeTimeout = setTimeout(reject, timeout);
		const t0 = performance.now();
		socket.emit(name, {authorization, onlineAuthorization, body}, ({err, data}:{err: boolean, data: any}) => {
			clearTimeout(nodeTimeout);
			const t1 = performance.now();
			console.log(name, `${t1 - t0}ms` , body, data);
			if (loading) eventEmitter.emitChange('loading', false);
			if (!err && data?.code && typeof data.data !== 'object') {
				displayMessage('success', i18next.t(`SUCCESS_CODES.${data.code}`, {data: data.data}));
			} else if (err && data?.message?.code && typeof data.data !== 'object') {
				displayMessage('error', i18next.t(`ERROR_CODES.${data.message.code}`, {data: data.data}));
			}
			err ? reject(data) : resolve(data);
		});
	});
}

socket.on('error', (err) => {
	displayMessage('error', i18next.t(`ERROR_CODES.${err.code}`, {repo: err.data?.repo.Name, err: err.data?.err}));
});

export function getSocket() {
	return socket;
}

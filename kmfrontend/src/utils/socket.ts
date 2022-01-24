import { addBreadcrumb, Severity } from '@sentry/react';
import i18next from 'i18next';
import { io, Socket } from 'socket.io-client';

import { displayMessage, eventEmitter } from './tools';

let socket: Socket;
let proxy: boolean;
let authorization;
let onlineAuthorization;

if (document.querySelector<HTMLMetaElement>('meta[name="target"]').content === 'NO-REMOTE') {
	if (process.env.NODE_ENV === 'development') {
		socket = io(`http://${window.location.hostname}:1337`, { transports: ['websocket'], upgrade: false });
	} else {
		socket = io({ transports: ['websocket'], upgrade: false });
	}
	proxy = false;
} else {
	socket = io(`/${document.querySelector<HTMLMetaElement>('meta[name="target"]').content}`, {
		transports: ['websocket'],
		upgrade: false,
	});
	proxy = true;
}

export function setAuthorization(authorizationParam: string, onlineAuthorizationParam: string) {
	authorization = authorizationParam;
	if (!authorizationParam || onlineAuthorizationParam) onlineAuthorization = onlineAuthorizationParam;
}

export function commandBackend(name: string, body?: any, loading = false, timeout = 10000): Promise<any> {
	const bodyWithoutpwd = { ...body };
	if (bodyWithoutpwd.password) bodyWithoutpwd.password = undefined;
	addBreadcrumb({
		level: Severity.Info,
		category: 'commandBackend',
		message: name,
		data: bodyWithoutpwd,
	});
	return new Promise((resolve, reject) => {
		if (loading) eventEmitter.emitChange('loading', true);
		const nodeTimeout = setTimeout(reason => {
			addBreadcrumb({
				level: Severity.Warning,
				category: 'commandBackend',
				message: `${name} timeout`,
				data: bodyWithoutpwd,
			});
			reject(reason);
		}, timeout);
		socket.emit(
			name,
			{ authorization, onlineAuthorization, body },
			({ err, data }: { err: boolean; data: any }) => {
				clearTimeout(nodeTimeout);
				if (loading) eventEmitter.emitChange('loading', false);
				if (err) {
					addBreadcrumb({
						level: Severity.Warning,
						category: 'commandBackend',
						message: name,
						data: data,
					});
				} else {
					addBreadcrumb({
						level: Severity.Info,
						category: 'commandBackend',
						message: name,
						data: data?.message?.code || data?.code,
					});
				}
				if (!err && data?.message?.code && typeof data?.message?.data !== 'object') {
					displayMessage('success', i18next.t(`SUCCESS_CODES.${data.message.code}`, { data: data.data }));
				} else if (
					!err &&
					data?.code &&
					typeof data.code !== 'number' &&
					!data?.message?.data &&
					typeof data.data !== 'object'
				) {
					displayMessage('success', i18next.t(`SUCCESS_CODES.${data.code}`, { data: data.data }));
				} else if (err && data?.message?.code && typeof data.data !== 'object') {
					displayMessage('error', i18next.t(`ERROR_CODES.${data.message.code}`, { data: data.data }));
				}
				err ? reject(data) : resolve(data);
			}
		);
	});
}

export function getSocket() {
	return socket;
}

export function isRemote() {
	return proxy;
}

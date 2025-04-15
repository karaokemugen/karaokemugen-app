import { addBreadcrumb } from '@sentry/react';
import i18next from 'i18next';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';

import { displayMessage, eventEmitter } from './tools';
import { ExtractBodyType, ExtractResponseType, WSCmdDefinition } from '../../../src/lib/types/frontend';

let socket: Socket;
let proxy: boolean;
let authorization;
let onlineAuthorization;

const ioOpts: Partial<ManagerOptions & SocketOptions> = {
	transports: ['websocket'],
	upgrade: false,
	closeOnBeforeunload: false,
};

if (document.querySelector<HTMLMetaElement>('meta[name="target"]').content === 'NO-REMOTE') {
	if (process.env.NODE_ENV === 'development') {
		socket = io(`http://${window.location.hostname}:1337`, ioOpts);
	} else {
		socket = io(ioOpts);
	}
	proxy = false;
} else {
	socket = io(`/${document.querySelector<HTMLMetaElement>('meta[name="target"]').content}`, ioOpts);
	proxy = true;
}

export function setAuthorization(authorizationParam: string, onlineAuthorizationParam: string) {
	authorization = authorizationParam;
	if (!authorizationParam || onlineAuthorizationParam) onlineAuthorization = onlineAuthorizationParam;
}

export function commandBackend<T extends WSCmdDefinition<object, any>>(
	name: T,
	body?: ExtractBodyType<T>,
	loading = false,
	timeout = 30000,
	silent = false
): Promise<ExtractResponseType<T>> {
	const bodyWithoutpwd = { ...body };
	if (bodyWithoutpwd['password']) bodyWithoutpwd['password'] = undefined;
	addBreadcrumb({
		level: 'info',
		category: 'commandBackend',
		message: name.value,
		data: bodyWithoutpwd,
	});
	return new Promise((resolve, reject) => {
		if (loading) eventEmitter.emitChange('loading', true);
		const nodeTimeout = setTimeout(() => {
			addBreadcrumb({
				level: 'warning',
				category: 'commandBackend',
				message: `${name} timeout`,
				data: bodyWithoutpwd,
			});
			const error = new Error();
			error.message = `${name} timeout`;
			error.name = 'commandBackend timeout';
			reject(error);
		}, timeout);
		socket.emit(
			name.value,
			{ authorization, onlineAuthorization, body },
			({ err, data }: { err: boolean; data: any }) => {
				clearTimeout(nodeTimeout);
				if (loading) eventEmitter.emitChange('loading', false);
				if (err) {
					addBreadcrumb({
						level: 'warning',
						category: 'commandBackend',
						message: name.value,
						data: data,
					});
				} else {
					addBreadcrumb({
						level: 'info',
						category: 'commandBackend',
						message: name.value,
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
				} else if (err && data?.message?.code && typeof data.data !== 'object' && !silent) {
					displayMessage(
						data.code?.toString().startsWith('4') ? 'warning' : 'error',
						i18next.t(`ERROR_CODES.${data.message.code}`, { data: data.data })
					);
				}
				err ? reject(new Error(data?.message?.code ? data.message.code : JSON.stringify(data))) : resolve(data);
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

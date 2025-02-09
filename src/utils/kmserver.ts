import { io, Socket } from 'socket.io-client';

import { APIData } from '../lib/types/api.js';
import { getConfig } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { initRemote } from '../services/remote.js';
import Sentry from './sentry.js';
import { subRemoteUsers } from './userPubSub.js';

let socket: Socket;

const service = 'KMServer';

// Create a connection
function connectToKMServer() {
	if (socket) return;
	return new Promise<void>((resolve, reject) => {
		const conf = getConfig();
		let timeout = setTimeout(() => {
			reject(new Error('Connection timed out'));
			socket.disconnect();
		}, 5000);
		socket = io(`${conf.Online.Secure ? 'https' : 'http'}://${conf.Online.Host}`, {
			transports: ['websocket'],
		});
		socket.on('connect', () => {
			clearTimeout(timeout);
			timeout = undefined;
			resolve();
		});
		socket.on('connect_error', err => {
			if (timeout) reject(err);
		});
		socket.on('disconnect', reason => {
			logger.warn('Connection lost with server,', { service, obj: reason });
		});
	});
}

export async function initKMServerCommunication(remote: boolean) {
	try {
		profile('initKMServerComms');
		logger.debug('Connecting to KMServer via socket.io', { service });
		await connectToKMServer();
		subRemoteUsers();
		if (remote) initRemote();
	} catch (err) {
		logger.error('Cannot establish socket connection to KMServer', { service, obj: err });
		Sentry.error(err, 'warning');
		// Non fatal.
	} finally {
		profile('initKMServerComms');
	}
}

export function getKMServerSocket() {
	return socket;
}

export function commandKMServer<T = any>(name: string, data: APIData<T>, timeout = 5000): Promise<any> {
	return new Promise((resolve, reject) => {
		const nodeTimeout = setTimeout(() => {
			reject(new Error('Request timed out'));
		}, timeout);
		socket.emit(name, data, ack => {
			clearTimeout(nodeTimeout);
			ack.err ? reject(ack.data) : resolve(ack.data);
		});
	});
}

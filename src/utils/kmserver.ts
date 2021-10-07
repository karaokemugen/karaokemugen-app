import { io, Socket } from 'socket.io-client';

import { APIData } from '../lib/types/api';
import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';

let socket: Socket;

// Create a connection
function connectToKMServer() {
	if (socket) return;
	return new Promise<void>((resolve, reject) => {
		const conf = getConfig();
		let timeout = setTimeout(() => {
			reject(new Error('Connection timed out'));
			socket.disconnect();
		}, 5000);
		socket = io(`https://${conf.Online.Host}`, {
			transports: ['websocket'],
		});
		socket.on('connect', () => {
			clearTimeout(timeout);
			timeout = undefined;
			resolve();
		});
		socket.on('connect_error', (err) => {
			if (timeout) reject(err);
		});
		socket.on('disconnect', (reason) => {
			logger.warn('Connection lost with server,', { service: 'KMOnline', obj: reason });
		});
	});
}

export async function initKMServerCommunication() {
	try {
		logger.debug('Connecting to KMServer via socket.io', { service: 'KMOnline' });
		await connectToKMServer();
		// Hooks?
	} catch (e) {
		logger.error('Cannot establish socket connection to KMServer', { service: 'KMOnline', obj: e });
		throw e;
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
		socket.emit(name, data, (ack) => {
			clearTimeout(nodeTimeout);
			ack.err ? reject(ack.data) : resolve(ack.data);
		});
	});
}

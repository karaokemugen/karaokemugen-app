import io from 'socket.io-client';

import {getConfig} from '../lib/utils/config';
import logger from '../lib/utils/logger';

let socket: SocketIOClient.Socket;

// Create a connection
function connectToKMServer() {
	return new Promise<void>((resolve, reject) => {
		const conf = getConfig();
		socket = io(`https://${conf.Online.Host}`);
		socket.on('connect', () => {
			resolve();
		});
		socket.on('connect_error', () => {
			reject(new Error('Socket.IO cannot connect'));
		});
	});
}

export async function initKMServerCommunication() {
	try {
		logger.debug('Connecting to KMServer via socket.io', {service: 'KMOnline'});
		await connectToKMServer();
		// Hooks?
	} catch (e) {
		logger.error('Cannot establish socket connection to KMServer', {service: 'KMOnline', obj: e});
	}
}

export function getKMServerSocket() {
	return socket;
}

export function commandKMServer(name: string, data: any): Promise<any> {
	return new Promise((resolve) => {
		socket.emit(name, data, ack => {
			resolve(ack);
		});
	});
}

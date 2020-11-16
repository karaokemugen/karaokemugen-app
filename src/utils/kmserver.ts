import io from 'socket.io-client';

import {getConfig} from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { APIData } from '../lib/types/api';

let socket: SocketIOClient.Socket;

// Create a connection
function connectToKMServer() {
	return new Promise<void>((resolve, reject) => {
		const conf = getConfig();
		const timeout = setTimeout(() => {
			reject(new Error('Connection timed out'));
		}, 5000);
		socket = io(`https://${conf.Online.Host}`);
		socket.on('connect', () => {
			resolve();
			clearTimeout(timeout);
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
		throw e;
	}
}

export function getKMServerSocket() {
	return socket;
}

export function commandKMServer(name: string, data: APIData, timeout = 5000): Promise<any> {
	return new Promise((resolve, reject) => {
		const nodeTimeout = setTimeout(() => {
			reject(new Error('Request timed out'));
		}, timeout);
		socket.emit(name, data, ack => {
			clearTimeout(nodeTimeout);
			ack.err ? reject(ack.data):resolve(ack.data);
		});
	});
}

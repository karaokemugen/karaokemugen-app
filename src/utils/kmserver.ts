import { io, Socket } from 'socket.io-client';

import { interval, Subscription } from 'rxjs';
import { APIData } from '../lib/types/api.js';
import { getConfig } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { initRemote } from '../services/remote.js';
import Sentry from './sentry.js';
import { subRemoteUsers } from './userPubSub.js';

let socket: Socket;
let checkLatencyIntervalSubscription: Subscription;

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

		if (checkLatencyIntervalSubscription) checkLatencyIntervalSubscription.unsubscribe();
		checkLatencyIntervalSubscription = interval(10_000).subscribe(() => checkSocketLatency(socket));
	});
}

export function checkSocketLatency(socket: Socket) {
	try {
		const start = Date.now();
		// volatile, so the packet will be discarded if the socket is not connected
		socket.timeout(20_000).volatile.emit('ping', {}, (_err, _res) => {
			const latencyMs = Date.now() - start;
			// logger.debug(`Socket recieved pong, latency: ${latencyMs}ms`, { service })
			if (latencyMs > 100) logger.info(`Latency to remote: ${latencyMs}ms`, { service });
			if (latencyMs > 500)
				logger.warn('High latency detected, the interface might be unresponsive for guests', { service });
		});
	} catch (e) {
		// Not fatal
	}
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

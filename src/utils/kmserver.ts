import { io, Socket } from 'socket.io-client';

import dayjs from 'dayjs';
import { catchError, filter, interval, map, Observable, pairwise, Subscription, switchMap, tap } from 'rxjs';
import { APIMessage } from '../lib/services/frontend.js';
import { APIData } from '../lib/types/api.js';
import { getConfig } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
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
			if (checkLatencyIntervalSubscription) checkLatencyIntervalSubscription.unsubscribe();
			checkLatencyIntervalSubscription = socketLatencyCheck$(socket, conf.Online.Host).subscribe();
			resolve();
		});
		socket.on('connect_error', err => {
			if (timeout) reject(err);
		});
		socket.on('disconnect', reason => {
			logger.warn('Connection lost with server,', { service, obj: reason });
			if (checkLatencyIntervalSubscription) checkLatencyIntervalSubscription.unsubscribe();
		});
	});
}

const socketLatencyCheck$ = (socket: Socket, remoteHost: string, intervalMs = 10_000) =>
	interval(intervalMs).pipe(
		filter(_ => socket.connected),
		switchMap(
			_ =>
				new Observable<{
					error;
					response;
					latencyMs: number;
					socketErrorDetected: boolean;
					responseDate: Date;
					notify?: boolean;
					lastNotification?: Date;
				}>(subscriber => {
					const pingStartTime = Date.now();
					socket.timeout(20_000).volatile.emit('ping', {}, (error, response) => {
						const latencyMs = Date.now() - pingStartTime;
						subscriber.next({
							error,
							response,
							latencyMs,
							socketErrorDetected: !!error,
							responseDate: new Date(),
						});
						subscriber.complete();
					});
				})
		),
		// Log every higher latency for further log debugging
		tap(payload => {
			if (payload.latencyMs > 100)
				logger.info(
					`Latency to remote is ${payload.latencyMs}ms${payload.socketErrorDetected ? ' (timeout or socket error)' : ''}`,
					{ service }
				);
		}),
		// Notify only when latency is high for two subsequent times
		pairwise(),
		map(([previousValue, currentValue]) => {
			currentValue.lastNotification = previousValue.lastNotification;
			const maxLatencyForWarning = 200;
			const notifyOperatorInterval = 15; // Minutes
			if (previousValue?.latencyMs >= maxLatencyForWarning && currentValue?.latencyMs >= maxLatencyForWarning) {
				if (
					!previousValue.notify &&
					(!previousValue.lastNotification ||
						dayjs(previousValue.lastNotification).diff() < -1000 * 60 * notifyOperatorInterval)
				) {
					currentValue.notify = true;
					currentValue.lastNotification = new Date();
				}
			}
			return [previousValue, currentValue];
		}),
		tap(([previousValue, currentValue]) => {
			if (currentValue.notify) {
				logger.warn(
					`${currentValue.socketErrorDetected ? 'Socket error' : 'High latency'} to remote "${remoteHost}" detected, the interface might be unresponsive for users. Recent latencies: ${previousValue.latencyMs}ms, ${currentValue.latencyMs}ms`,
					{ service, currentValue, previousValue }
				);
				emitWS(
					'operatorNotificationWarning',
					APIMessage(`WARNING_CODES.REMOTE_HIGH_LATENCY_DETECTED`, {
						latencyMs: currentValue.latencyMs,
						host: remoteHost,
					})
				);
			}
		}),
		catchError(_error => {
			return null;
		})
	);

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

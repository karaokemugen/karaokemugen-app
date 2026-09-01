import dayjs from 'dayjs';
import { catchError, EMPTY, filter, interval, map, Observable, pairwise, Subscription, switchMap, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { APIMessage } from '../lib/services/frontend.js';
import { APIData } from '../lib/types/api.js';
import { getConfig } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { initRemote } from '../services/remote.js';
import Sentry from './sentry.js';
import { subRemoteUsers } from './userPubSub.js';

let socket: Socket;
let socketURL: string;
let checkLatencyIntervalSubscription: Subscription;

const service = 'KMServer';

// Create a connection
export function connectToKMServer(reset = false) {
	const conf = getConfig();
	const url = `${conf.Online.RemoteAccess.Secure ? 'https' : 'http'}://${conf.Online.RemoteAccess.Domain}`;
	// Reset connection if server changes
	if (reset || (socket && socketURL !== url)) disconnectFromKMServer();
	if (socket) return;
	logger.debug('Connecting to KMServer via socket.io', { service });
	try {
		return new Promise<void>((resolve, reject) => {
			let connectErrorLogged = false;
			socketURL = url;
			socket = io(url, {
				transports: ['websocket'],
				timeout: 5000, // Socket stays alive and retries after timeout
			});
			socket.on('connect', () => {
				connectErrorLogged = false;
				if (checkLatencyIntervalSubscription) checkLatencyIntervalSubscription.unsubscribe();
				checkLatencyIntervalSubscription = socketLatencyCheck$(
					socket,
					conf.Online.RemoteAccess.Domain
				).subscribe();
				resolve();
			});
			socket.on('connect_error', err => {
				if (!connectErrorLogged) { // Log first error only, more will be logged by reconnect events
					connectErrorLogged = true;
					logger.warn(`Cannot reach KMServer: ${err.message}`, { service });
				}
				
				reject(err);
			});
			socket.io.on('reconnect_attempt', onReconnectAttempt);
			socket.io.on('reconnect', onReconnect);
			socket.on('disconnect', reason => {
				logger.warn('Connection lost with server,', { service, obj: reason });
				if (checkLatencyIntervalSubscription) checkLatencyIntervalSubscription.unsubscribe();
				// socket.io doesn't reconnect by itself when the server closed the connection
				if (reason === 'io server disconnect') socket.connect();
			});
		});
	} catch (err) {
		logger.error('Cannot establish socket connection to KMServer', { service, obj: err });
		Sentry.error(err, 'warning');
		// Non fatal.
	}
}

function onReconnectAttempt(attempt: number) {
	if (attempt % 10 === 0) logger.info(`Trying to reconnect (attempt ${attempt})`, { service });
}

function onReconnect(attempt: number) {
	logger.info(`Reconnected to KMServer after ${attempt} attempt${attempt === 1 ? '' : 's'}`, { service });
}

function disconnectFromKMServer() {
	if (!socket) return;
	if (checkLatencyIntervalSubscription) checkLatencyIntervalSubscription.unsubscribe();
	socket.io.off('reconnect_attempt', onReconnectAttempt);
	socket.io.off('reconnect', onReconnect);
	socket.removeAllListeners();
	socket.disconnect();
	socket = undefined;
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
			const maxLatencyForWarning = 500;
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
		catchError(_error => EMPTY)
	);

export async function initKMServerCommunication() {
	profile('initKMServerComms');
	if (getConfig().Online.RemoteAccess.Enabled) {
		try {
			await connectToKMServer();
		} catch (err) {	}
		initRemote();
	}
	if (getConfig().Online.RemoteUsers.Enabled) {
		subRemoteUsers();
	}
	profile('initKMServerComms');
}

export function getKMServerSocket() {
	return socket;
}

export function commandKMServer<T = any>(name: string, data: APIData<T>, timeout = 5000): Promise<any> {
	return new Promise((resolve, reject) => {
		if (!socket?.connected) {
			reject(new Error('Socket is not connected'));
			return;
		}
		socket.timeout(timeout).emit(name, data, (err: Error, ack: any) => {
			if (err) return reject(new Error('Request timed out'));
			ack?.err ? reject(ack.data) : resolve(ack?.data);
		});
	});
}

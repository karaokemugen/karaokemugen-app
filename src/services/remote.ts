import { getInstanceID, getSettings, saveSetting } from '../lib/dao/database';
import { APIDataProxied } from '../lib/types/api';
import { RemoteSettings, RemoteSuccess } from '../lib/types/remote';
import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { getWS } from '../lib/utils/ws';
import { configureHost } from '../utils/config';
import { commandKMServer, getKMServerSocket } from '../utils/kmserver';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';

let errCount = 0;

async function startRemote(): Promise<RemoteSuccess> {
	try {
		let { remoteToken } = await getSettings();
		if (!remoteToken) {
			remoteToken = '';
		}
		const result = await commandKMServer<RemoteSettings>('remote start', {
			body: {
				InstanceID: await getInstanceID(),
				version: getState().version.number,
				token: remoteToken,
			},
		});
		if (result.err && result.reason === 'INVALID_TOKEN') {
			// Ask for a new token by deleting the invalid one
			await saveSetting('remoteToken', '');
			return await startRemote();
		}
		if (result.err) {
			throw new Error(`Server refused to start remote: ${result.reason}`);
		} else {
			await saveSetting('remoteToken', result.token);
			errCount = 0;
			return result;
		}
	} catch (err) {
		if (err?.message?.code === 'UNKNOWN_COMMAND') {
			logger.warn(
				`${getConfig().Online.Host} doesn't support remote access, maybe try a different online server`,
				{ service: 'Remote', obj: err }
			);
		} else if (err?.message?.code === 'OUTDATED_CLIENT') {
			logger.warn(
				`${
					getConfig().Online.Host
				} and your application doesn't have compatible versions of KMFrontend, cannot start remote.`,
				{ service: 'Remote', obj: err }
			);
		} else {
			sentry.error(err, 'Warning');
		}
		throw err;
	}
}

function removeRemote() {
	setState({ remoteAccess: null });
	configureHost();
}

async function stopRemote() {
	await commandKMServer<Record<never, never>>('remote stop', { body: {} });
	removeRemote();
}

async function restartRemote() {
	if (!getConfig().Online.Remote) return;
	try {
		logger.debug('Reconnection...', { service: 'Remote' });
		const data = await startRemote();
		logger.info('Remote was RESTARTED', { service: 'Remote', obj: data });
		setState({ remoteAccess: data });
		configureHost();
	} catch (e) {
		logger.warn('Remote is UNAVAILABLE', { service: 'Remote', obj: e });
	}
}

async function proxy(ev: string, data: APIDataProxied, ack: (res) => void) {
	if (ev.startsWith('proxy ')) {
		ack(await getWS().emulate(ev.substring(6), data, data.headers));
	}
}

async function broadcastForward(body) {
	if (errCount === -1) return;
	commandKMServer('remote broadcast', {
		body,
	})
		.then(() => {
			errCount = 0;
		})
		.catch(err => {
			logger.warn('Failed to remote broadcast', { service: 'Remote', obj: err });
			if (errCount !== -1) errCount += 1;
			if (errCount >= 5) {
				logger.warn('The remote broadcast failed 5 times in a row, restart remote');
				errCount = -1;
				getKMServerSocket().disconnect();
				setTimeout(() => {
					getKMServerSocket().connect();
				}, 2500).unref();
			}
		});
}

export async function destroyRemote() {
	try {
		await stopRemote();
	} catch (err) {
		logger.error('Cannot stop remote', { service: 'Remote' });
	}
	// Remove all subscriptions
	if (getKMServerSocket()) {
		getKMServerSocket().offAny(proxy);
		getKMServerSocket().off('connect', restartRemote);
		getKMServerSocket().off('disconnect', removeRemote);
	}
	getWS().off('broadcast', broadcastForward);
	logger.info('Remote is STOPPED', { service: 'Remote' });
	setState({ remoteAccess: null });
	configureHost();
}

export async function initRemote() {
	try {
		const data = await startRemote();
		getKMServerSocket().onAny(proxy);
		// This will be triggered on reconnection, as the first connect is handled by initKMServerCommunication
		getKMServerSocket().on('connect', restartRemote);
		getKMServerSocket().on('disconnect', removeRemote);
		getWS().on('broadcast', broadcastForward);
		// Strip token from public output to avoid leaks
		delete data.token;
		logger.info('Remote is READY', { service: 'Remote', obj: data });
		setState({ remoteAccess: data });
		configureHost();
	} catch (err) {
		if (err?.message?.code) {
			setState({ remoteAccess: { err: true, reason: err.message.code } });
		}
	}
}

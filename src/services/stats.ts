import { promises as fs } from 'fs';
import internet from 'internet-available';
import { cloneDeep } from 'lodash';
import { resolve } from 'path';
import prettyBytes from 'pretty-bytes';
import si from 'systeminformation';

import { selectPlayed, selectRequests } from '../dao/stats.js';
import { APIMessage } from '../lib/services/frontend.js';
import { getConfig, resolvedPath } from '../lib/utils/config.js';
import HTTP from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { getPublicConfig } from '../utils/config.js';
import sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { statsEnabledRepositories } from './repo.js';
import { getSessions } from './session.js';

const service = 'Stats';

let uploadIntervalID: any;

/** Initialize stats upload */
export function initStats(sendLater: boolean) {
	if (!uploadIntervalID) uploadIntervalID = setInterval(sendAllPayloads, 3600000);
	if (!sendLater) sendAllPayloads();
}

export function stopStatsSystem() {
	if (uploadIntervalID) clearInterval(uploadIntervalID);
}

export async function sendAllPayloads() {
	const repos = statsEnabledRepositories();
	for (const repo of repos) {
		sendPayload(repo.Name, repo.Secure);
	}
}

/** Send stats payload to KM Server */
export async function sendPayload(host: string, secure: boolean) {
	let payload: any;
	try {
		try {
			await internet();
		} catch (err) {
			throw 'This instance is not connected to the internets';
		}
		payload = await buildPayload();
		if (!payload.instance.instance_id) throw 'Could not fetch instance ID';
		logger.info(`Sending payload to ${host} (${prettyBytes(JSON.stringify(payload).length)})`, {
			service,
		});
		savePayload(payload, host);
		await HTTP.post(`${secure ? 'https' : 'http'}://${host}/api/stats`, payload);

		logger.info(`Payload sent successfully to ${host}`, { service });
	} catch (err) {
		logger.warn(`Uploading stats payload failed (${host})`, { service, obj: err });
		if (err !== 'This instance is not connected to the internets' && err !== 'Could not fetch instance ID') {
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.STATS_PAYLOAD'));
			if (payload) sentry.addErrorInfo('Payload', JSON.stringify(payload, null, 2), payload);
			sentry.error(err);
		}
	}
}

async function savePayload(payload: any, host: string) {
	try {
		await fs.writeFile(
			resolve(resolvedPath('Logs'), `statsPayload-${host}.json`),
			JSON.stringify(payload, null, 2),
			'utf-8'
		);
		logger.info('Payload data saved locally to logs/statsPayload.json', { service });
	} catch (err) {
		// Non-fatal
		logger.warn('Could not save payload', { service, obj: err });
		sentry.error(err, 'warning');
	}
}

/** Create stats payload */
async function buildPayload() {
	return {
		payloadVersion: 3,
		instance: await buildInstanceStats(),
		viewcounts: await selectPlayed(),
		requests: await selectRequests(),
		sessions: await getSessions(),
	};
}

/** Create system information stats */
async function buildInstanceStats() {
	const state = getState();
	let extraStats = {};
	const conf = cloneDeep(getPublicConfig(true, false));
	const [cpu, mem, gfx, os, disks] = await Promise.all([
		si.cpu(),
		si.mem(),
		si.graphics(),
		si.osInfo(),
		si.diskLayout(),
	]);
	let total_disk_size = 0;
	disks.forEach(d => {
		total_disk_size += d.size;
	});
	extraStats = {
		locale: state.defaultLocale,
		screens: gfx.displays.length,
		cpu_manufacturer: cpu.manufacturer,
		cpu_model: cpu.brand,
		cpu_speed: cpu.speed,
		cpu_cores: cpu.cores,
		memory: mem.total,
		total_disk_space: total_disk_size,
		os_platform: os.platform,
		os_distro: os.distro,
		os_release: os.release,
	};
	return {
		config: { ...conf },
		instance_id: getConfig().App.InstanceID,
		version: state.version.number,
		...extraStats,
	};
}

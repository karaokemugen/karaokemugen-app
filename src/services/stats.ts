import { promises as fs } from 'fs';
import internet from 'internet-available';
import { cloneDeep } from 'lodash';
import { resolve } from 'path';
import prettyBytes from 'pretty-bytes';
import si from 'systeminformation';

import { selectPlayed, selectRequests } from '../dao/stats.js';
import { getInstanceID } from '../lib/dao/database.js';
import { getConfig, resolvedPath } from '../lib/utils/config.js';
import HTTP from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { getPublicConfig } from '../utils/config.js';
import sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { getSessions } from './session.js';
import { APIMessage } from '../lib/services/frontend.js';

const service = 'Stats';

let intervalID: any;

/** Initialize stats upload */
export function initStats(sendLater: boolean) {
	if (!intervalID) intervalID = setInterval(sendAllPayloads, 3600000);
	if (!sendLater) sendAllPayloads();
}

/** Stop stats upload */
export function stopStats() {
	if (intervalID) clearInterval(intervalID);
	intervalID = undefined;
}

export async function sendAllPayloads() {
	const repos = getConfig().System.Repositories.filter(r => r.Online && r.Enabled && r.SendStats);
	for (const repo of repos) {
		const minimal = getConfig().Online.Host !== repo.Name;
		sendPayload(repo.Name, minimal);
	}
}

/** Send stats payload to KM Server */
export async function sendPayload(host: string, minimal: boolean) {
	let payload: any;
	try {
		try {
			await internet();
		} catch (err) {
			throw 'This instance is not connected to the internets';
		}
		payload = await buildPayload(minimal);
		if (!payload.instance.instance_id) throw 'Could not fetch instance ID';
		logger.info(`Sending payload to ${host} (${prettyBytes(JSON.stringify(payload).length)})`, {
			service,
		});
		savePayload(payload, host);
		await HTTP.post(`https://${host}/api/stats`, payload);

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
async function buildPayload(minimal: boolean) {
	return {
		payloadVersion: 3,
		instance: await buildInstanceStats(minimal),
		viewcounts: await selectPlayed(),
		requests: await selectRequests(),
		sessions: await getSessions(),
	};
}

/** Create system information stats */
async function buildInstanceStats(minimal: boolean) {
	const state = getState();
	let extraStats = {};
	let conf: any;
	if (minimal) {
		conf = { minimal: true };
	} else {
		conf = cloneDeep(getPublicConfig());
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
	}
	return {
		config: { ...conf },
		instance_id: await getInstanceID(),
		version: state.version.number,
		...extraStats,
	};
}

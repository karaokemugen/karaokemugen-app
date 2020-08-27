import internet from 'internet-available';
import cloneDeep from 'lodash.clonedeep';
import {resolve} from 'path';
import prettyBytes from 'pretty-bytes';
import si from 'systeminformation';

import { APIMessage } from '../controllers/common';
import { exportFavorites,exportPlayed, exportRequests } from '../dao/stats';
import { getInstanceID } from '../lib/dao/database';
import { getConfig } from '../lib/utils/config';
import { asyncWriteFile } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import { getSessions } from './session';

let intervalID: any;

/** Initialize stats upload */
export function initStats(sendLater: boolean) {
	if (!intervalID) intervalID = setInterval(sendPayload, 3600000);
	if (!sendLater) sendPayload();
}

/** Stop stats upload */
export function stopStats() {
	if (intervalID) clearInterval(intervalID);
	intervalID = undefined;
}

/** Send stats payload to KM Server */
export async function sendPayload() {
	try {
		try {
			await internet();
		} catch(err) {
			throw 'This instance is not connected to the internets';
		}
		const payload = await buildPayload();
		if (!payload.instance.instance_id) throw 'Could not fetch instance ID';
		logger.info(`Sending payload (${prettyBytes(JSON.stringify(payload).length)})`, {service: 'Stats'});
		const conf = getConfig();
		await HTTP.post(`https://${conf.Online.Host}/api/stats`, {
			json: payload
		});
		savePayload(payload);
		logger.info('Payload sent successfully', {service: 'Stats'});
	} catch(err) {
		logger.warn('Uploading stats payload failed', {service: 'Stats', obj: err});
		if (err !== 'This instance is not connected to the internets' ||
			err !== 'Could not fetch instance ID'
		) {
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.STATS_PAYLOAD'));
			sentry.error(err);
		}
	}

}

async function savePayload(payload: any) {
	try {
		await asyncWriteFile(resolve(getState().dataPath, 'logs/statsPayload.json'), JSON.stringify(payload, null, 2), 'utf-8');
		logger.info('Payload data saved locally to logs/statsPayload.json', {service: 'Stats'});
	} catch(err) {
		// Non-fatal
		logger.warn('Could not save payload', {service: 'Stats', obj: err});
		sentry.error(err, 'Warning');
	}
}

/** Create stats payload */
async function buildPayload() {
	return {
		payloadVersion: 3,
		instance: await buildInstanceStats(),
		viewcounts: await exportPlayed(),
		requests: await exportRequests(),
		favorites: await exportFavorites(),
		sessions: await getSessions()
	};
}

/** Create system information stats */
async function buildInstanceStats() {
	const conf = cloneDeep(getConfig());
	const state = getState();
	// Delete sensitive info
	delete conf.App.JwtSecret;
	delete conf.Database.prod;
	delete conf.Gitlab.Token;
	if (conf.Karaoke.StreamerMode.Twitch.OAuth) delete conf.Karaoke.StreamerMode.Twitch.OAuth;
	const [cpu, mem, gfx, os, disks] = await Promise.all([
		si.cpu(),
		si.mem(),
		si.graphics(),
		si.osInfo(),
		si.diskLayout()
	]);
	let total_disk_size = 0;
	disks.forEach(d => {
		total_disk_size += d.size;
	});
	return {
		config: {...conf},
		instance_id: await getInstanceID(),
		version: state.version.number,
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
		os_release: os.release
	};
}

import { getConfig } from '../_utils/config';
import { getState } from '../_utils/state';
import si from 'systeminformation';
import { exportPlayed, exportRequests, exportFavorites } from '../_dao/stats';
import internet from 'internet-available';
import got from 'got';
import logger from 'winston';
import prettyBytes from 'pretty-bytes';
import { asyncWriteFile } from '../_utils/files';
import {resolve} from 'path';
import cloneDeep from 'lodash.clonedeep';

let intervalID;

export async function initStats() {
	logger.debug('[Stats] Starting stats upload');
	if (!intervalID) intervalID = setInterval(sendPayload, 3600000);
	sendPayload();
}

export async function stopStats() {
	logger.debug('[Stats] Stopping stats upload');
	if (intervalID) clearInterval(intervalID);
	intervalID = undefined;
}

export async function sendPayload() {
	try {
		try {
			await internet();
		} catch(err) {
			throw 'This instance is not connected to the internets';
		}
		const payload = await buildPayload();
		logger.info(`[Stats] Sending payload (${prettyBytes(JSON.stringify(payload).length)})`);
		logger.debug('[Stats] Payload data saved locally to logs/statsPayload.json');
		const conf = getConfig();
		asyncWriteFile(resolve(getState().appPath, 'logs/statsPayload.json'), JSON.stringify(payload, null, 2), 'utf-8');
		try {
			await got(`https://${conf.Online.Host}/api/stats`,{
				json: true,
				body: payload
			});
		} catch(err) {
			throw err;
		}
		logger.info('[Stats] Payload sent successfully');
	} catch(err) {
		logger.error(`[Stats] Uploading stats payload failed : ${err}`);
	}

}

async function buildPayload() {
	return {
		payloadVersion: 2,
		instance: await buildInstanceStats(),
		viewcounts: await exportPlayed(),
		requests: await exportRequests(),
		favorites: await exportFavorites(),
	};
}

async function buildInstanceStats() {
	const conf = cloneDeep(getConfig());
	const state = getState();
	delete conf.App.JwtSecret;
	const [cpu, mem, gfx, os, disks] = await Promise.all([
		si.cpu(),
		si.mem(),
		si.graphics(),
		si.osInfo(),
		si.diskLayout()
	]);
	let total_disk_size = 0;
	for (const disk of disks) {
		total_disk_size = total_disk_size + disk.size;
	}
	return {
		config: {...conf},
		instance_id: conf.App.InstanceID,
		version: state.version.number,
		locale: state.EngineDefaultLocale,
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
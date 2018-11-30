import { getConfig } from '../_common/utils/config';
import si from 'systeminformation';
import { exportViewcounts, exportRequests, exportFavorites } from '../_dao/stats';
import internet from 'internet-available';
import got from 'got';
import logger from 'winston';
import prettyBytes from 'pretty-bytes';

let intervalID;

export async function initStats() {
	logger.debug('[Stats] Starting stats upload');
	if (!intervalID) intervalID = setInterval(sendPayload, 3600000);
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
			throw `This instance is not connected to the internets : ${err}`;
		}
		const payload = await buildPayload();
		logger.info(`[Stats] Sending payload (${prettyBytes(JSON.stringify(payload).length)})`);
		logger.debug(`[Stats] Payload being sent : ${JSON.stringify(payload,null,2)}`);
		const conf = getConfig();
		await got(`http://${conf.OnlineHost}:${conf.OnlinePort}/api/stats`,{
			json: true,
			body: payload
		});
		logger.info('[Stats] Payload sent successfully');
	} catch(err) {
		logger.error(`[Stats] Uploading stats payload failed : ${err}`);
	}

}

async function buildPayload() {
	return {
		instance: await buildInstanceStats(),
		viewcounts: await exportViewcounts(),
		requests: await exportRequests(),
		favorites: await exportFavorites(),
	};
}

async function buildInstanceStats() {
	const conf = getConfig();
	delete conf.JwtSecret;
	delete conf.osHost;
	delete conf.osURL;
	delete conf.appPath;
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
		instance_id: conf.appInstanceID,
		version: conf.VersionNo,
		locale: conf.EngineDefaultLocale,
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
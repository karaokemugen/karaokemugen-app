import {selectDownloadBLC, truncateDownloadBLC, insertDownloadBLC, updateDownloadBLC, deleteDownloadBLC, emptyDownload, selectDownload, selectDownloads, updateDownload, deleteDownload, insertDownloads, selectPendingDownloads, initDownloads} from '../_dao/download';
import Downloader from '../_utils/downloader';
import Queue from 'better-queue';
import uuidV4 from 'uuid/v4';
import {getConfig} from '../_utils/config';
import {resolve} from 'path';
import internet from 'internet-available';
import logger from 'winston';
import {asyncMove} from '../_utils/files';
import { integrateSeriesFile } from '../_dao/seriesfile';
import { integrateKaraFile } from '../_dao/karafile';
import {getState} from '../_utils/state';
import {uuidRegexp} from '../_services/constants';
import {refreshKarasAfterDBChange} from './kara';
import {refreshSeriesAfterDBChange} from './series';
import { compareKarasChecksum } from '../_dao/database';
import { emitWS } from '../_webapp/frontend';
import got from 'got';

const queueOptions = {
	id: 'uuid',
	precondition: cb => {
		internet()
			.then(cb(null, true))
			.catch(cb(null, false));
	},
	preconditionRetryTimeout: 10*1000,
	cancelIfRunning: true
};

let q;

function emitQueueStatus(status) {
	emitWS('downloadQueueStatus', status);
}

function queueDownload(input, done) {
	logger.info(`[Download] Processing queue item : ${input.name}`);
	processDownload(input)
		.then(() => {
			done();
		})
		.catch(err => {
			done(err);
		});
}

export async function initDownloader() {
	initQueue();
	await initDownloads();
	//Returning early for now, we don't relaunch pending downloads on startup
	//await startDownloads();
	return;
}


function initQueue() {
	// We'll compare data dir checksum and execute refresh every 5 downloads and everytime the queue is drained
	let taskCounter = 0;
	q = new Queue(queueDownload, queueOptions);
	q.on('task_finish', () => {
		taskCounter++;
		if (taskCounter >= 5) {
			logger.debug('[Download] Triggering database refresh');
			compareKarasChecksum(true);
			refreshSeriesAfterDBChange().then(refreshKarasAfterDBChange());
			taskCounter = 0;
		}
		emitQueueStatus('updated');
	});
	q.on('task_failed', (taskId, err) => {
		logger.error(`[Download] Task ${taskId} failed : ${err}`);
		emitQueueStatus('updated');
	});
	q.on('empty', () => emitQueueStatus('updated'));
	q.on('drain', () => {
		logger.info('[Download] Ano ne, ano ne! I finished all my downloads!');
		refreshSeriesAfterDBChange().then(refreshKarasAfterDBChange());
		taskCounter = 0;
		emitQueueStatus('updated');
		emitQueueStatus('stopped');
	});
}

export async function startDownloads() {
	if (q.length && q.length > 0) {
		resumeQueue();
	} else {
		const downloads = await selectPendingDownloads();
		try {
			await internet();
			downloads.forEach(dl => q.push(dl));
			logger.info('[Downloader] Download queue starting up');
			emitQueueStatus('started');
		} catch(err) {
			if (downloads.length > 0) logger.warn('[Downloader] There are planned downloads, but your computer seems offline');
			emitQueueStatus('stopped');
		}
	}
}

async function processDownload(download) {
	const conf = getConfig();
	const state = getState();
	await setDownloadStatus(download.uuid, 'DL_RUNNING');
	let list = [];
	const localMedia = resolve(state.appPath,conf.System.Path.Medias[0],download.urls.media.local);
	const localLyrics = resolve(state.appPath,conf.System.Path.Lyrics[0],download.urls.lyrics.local);
	const localKara = resolve(state.appPath,conf.System.Path.Karas[0],download.urls.kara.local);
	const localSeriesPath = resolve(state.appPath,conf.System.Path.Series[0]);

	let bundle = {
		kara: localKara,
		series: []
	};

	const tempMedia = resolve(state.appPath,conf.System.Path.Temp,download.urls.media.local);
	const tempLyrics = resolve(state.appPath,conf.System.Path.Temp,download.urls.lyrics.local);
	const tempKara = resolve(state.appPath,conf.System.Path.Temp,download.urls.kara.local);
	const tempSeriesPath = resolve(state.appPath,conf.System.Path.Temp);
	list.push({
		filename: tempMedia,
		url: download.urls.media.remote,
		id: download.name
	});
	if (download.urls.lyrics.local !== 'dummy.ass') list.push({
		filename: tempLyrics,
		url: download.urls.lyrics.remote,
		id: download.name
	});
	list.push({
		filename: tempKara,
		url: download.urls.kara.remote,
		id: download.name
	});

	for (const serie of download.urls.serie) {
		if (typeof serie.local == 'string') {
			list.push({
				filename: resolve(tempSeriesPath, serie.local),
				url: serie.remote,
				id: download.name
			});
			bundle.series.push(resolve(localSeriesPath, serie.local));
		}
	}

	await downloadFiles(download, list);
	// Delete files if they're already present
	await asyncMove(tempMedia, localMedia, {overwrite: true});
	if (download.urls.lyrics.local !== 'dummy.ass') await asyncMove(tempLyrics, localLyrics, {overwrite: true});
	await asyncMove(tempKara, localKara, {overwrite: true});
	for (const seriefile of download.urls.serie) {
		if (typeof seriefile.local == 'string') {
			await asyncMove(resolve(tempSeriesPath, seriefile.local), resolve(localSeriesPath, seriefile.local), {overwrite: true});
		}
	}
	logger.info(`[Download] Finished downloading item "${download.name}"`);
	// Now adding our newly downloaded kara
	try {
		for (const serie of bundle.series) {
			try {
				const serieName = await integrateSeriesFile(serie);
				logger.info(`[Download] Series "${serieName}" added to database`);
			} catch(err) {
				logger.error(`[Download] Series "${serie}" not properly added to database`);
				throw err;
			}
		}
		try {
			await integrateKaraFile(bundle.kara);
			logger.info(`[Download] Song "${download.name}" added to database`);
		} catch(err) {
			logger.error(`[Download] Song "${download.name}" not properly added to database`);
			throw err;
		}
	} catch(err) {
		logger.error(`[Download] Song "${download.name}" downloaded but not properly added to database. Regenerate your database manually after fixing errors`);
		throw err;
	}
}

async function downloadFiles(download, list) {
	const downloader = new Downloader(list, {
		bar: true
	});
	// Launch downloads
	return new Promise((resolve, reject) => {
		downloader.download(fileErrors => {
			if (fileErrors.length > 0) {
				setDownloadStatus(download.uuid, 'DL_FAILED')
					.then(() => {
						reject(`Error downloading this file : ${fileErrors.toString()}`);
					}).catch(err => {
						reject(`Error downloading this file : ${fileErrors.toString()} - setting failed status failed too! (${err})`);
					});
			} else {
				setDownloadStatus(download.uuid, 'DL_DONE')
					.then(() => {
						resolve();
					}).catch(err => {
						reject(`Download finished but setting its state failed : ${err}`);
					});
			}
		});
	});
}

export function pauseQueue() {
	// Queue is paused but the current running task is not paused.
	emitQueueStatus('paused');
	return q.pause();
}

export function resumeQueue() {
	emitQueueStatus('started');
	return q.resume();
}

export async function addDownloads(repo, downloads) {
	const currentDls = await getDownloads();
	let dls = downloads.map(dl => {
		for (const currentDl of currentDls) {
			if (dl.name === currentDl.name && (currentDl.status === 'DL_RUNNING' || currentDl.status === 'DL_PLANNED')) return null;
		}
		let seriefiles = [];
		for (const serie of dl.seriefiles) {
			seriefiles.push({
				remote: `http://${repo}/downloads/series/${serie}`,
				local: serie
			});
		}
		return {
			uuid: uuidV4(),
			urls: {
				media: {
					remote: `http://${repo}/downloads/medias/${dl.mediafile}`,
					local: dl.mediafile
				},
				lyrics: {
					remote: `http://${repo}/downloads/lyrics/${dl.subfile}`,
					local: dl.subfile
				},
				kara: {
					remote: `http://${repo}/downloads/karas/${dl.karafile}`,
					local: dl.karafile
				},
				serie: seriefiles
			},
			name: dl.name,
			size: dl.size,
			status: 'DL_PLANNED'
		};
	});
	//Remove downloads with null entry (they are already present and could not be added)
	dls = dls.filter(dl => dl !== null);
	if (dls.length === 0) throw 'No downloads added, all are already in queue or running';
	await insertDownloads(dls);
	try {
		await internet();
		dls.forEach(dl => q.push(dl));
		return `${dls.length} download(s) queued`;
	} catch(err) {
		return `${dls.length} Download(s) queued but no internet connection available`;
	}
}

export async function getDownloads() {
	return await selectDownloads();
}

export async function getDownload(uuid) {
	return await selectDownload(uuid);
}

export async function setDownloadStatus(uuid, status) {
	return await updateDownload(uuid, status);
}

export async function retryDownload(uuid) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status === 'DL_RUNNING') throw 'Download is already running!';
	if (dl.status === 'DL_PLANNED') throw 'Download is already planned!';
	await setDownloadStatus(uuid, 'DL_PLANNED');
	q.push(dl);
	emitQueueStatus('started');
}

export async function removeDownload(uuid) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status !== 'DL_PLANNED') throw 'Only planned downloads can be cancelled';
	await deleteDownload(uuid);
	q.cancel(uuid);
	emitQueueStatus('updated');
}

export async function wipeDownloads() {
	q.destroy();
	initQueue();
	emitQueueStatus('stopped');
	return await emptyDownload();
}

export async function getDownloadBLC() {
	return await selectDownloadBLC();
}

export async function addDownloadBLC(type, value) {
	if (+type < 0 && +type > 1004) throw `Incorrect BLC type (${type})`;
	if (+type === 1001 && !new RegExp(uuidRegexp).test(value)) throw `Blacklist criteria value mismatch : type ${type} must have UUID value`;
	if ((+type === 1002 || +type === 1003 || +type > 1004) && isNaN(value)) throw `Blacklist criteria type mismatch : type ${type} must have a numeric value!`;
	return await insertDownloadBLC(type, value);
}

export async function editDownloadBLC(id, type, value) {
	const dlBLC = await selectDownloadBLC();
	if (!dlBLC.some(e => e.dlblc_id === +id)) throw 'DL BLC ID does not exist';
	if (+type < 0 && +type > 1004) throw `Incorrect BLC type (${type})`;
	if (+type === 1001 && !new RegExp(uuidRegexp).test(value)) throw `Blacklist criteria value mismatch : type ${type} must have UUID value`;
	if ((+type === 1002 || +type === 1003 || +type > 1004) && isNaN(value)) throw `Blacklist criteria type mismatch : type ${type} must have a numeric value!`;
	return await updateDownloadBLC(id, type, value);
}

export async function removeDownloadBLC(id) {
	const dlBLC = await selectDownloadBLC();
	if (!dlBLC.some(e => e.dlblc_id === +id)) throw 'DL BLC ID does not exist';
	return await deleteDownloadBLC(id);
}

export async function emptyDownloadBLC() {
	return await truncateDownloadBLC();
}

export async function getRemoteKaras(instance, filter = '', from = 0, size = 99999999999999) {
	const params = new URLSearchParams([
		['filter', filter],
		['size', size],
		['from', from]
	]);
	const res = await got(`https://${instance}/api/karas?${params.toString()}`);
	return JSON.parse(res.body);
}
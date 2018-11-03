import {emptyDownload, selectDownload, selectDownloads, updateDownload, deleteDownload, insertDownloads, selectPendingDownloads, initDownloads} from '../_dao/download';
import Downloader from '../_common/utils/downloader';
import Queue from 'better-queue';
import uuidV4 from 'uuid/v4';
import {getConfig} from '../_common/utils/config';
import {resolve} from 'path';
import internet from 'internet-available';
import logger from 'winston';
import {asyncMove} from '../_common/utils/files';
import { integrateSeriesFile } from './series';
import { integrateKaraFile } from './kara';

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

function queueDownload(input, done) {
	logger.info(`[Download] Processing queue item : ${input.name}`);
	processDownload(input)
		.then(() => {
			done();
		})
		.catch((err) => {
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
	q = new Queue(queueDownload, queueOptions);
	q.on('task_failed', (taskId, err, stats) => logger.error(`[Download] Task ${taskId} failed : ${err}`));
	q.on('drain', () => logger.info('[Download] Ano ne, ano ne! I finished all my downloads!'));
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
		} catch(err) {
			if (downloads.length > 0) logger.warn('[Downloader] There are planned downloads, but your computer seems offline');
		}
	}
}

async function processDownload(download) {
	const conf = getConfig();
	await setDownloadStatus(download.uuid, 'DL_RUNNING');
	let list = [];
	const localMedia = resolve(conf.appPath,conf.PathMedias.split('|')[0],download.urls.media.local);
	const localLyrics = resolve(conf.appPath,conf.PathSubs.split('|')[0],download.urls.lyrics.local);
	const localKara = resolve(conf.appPath,conf.PathKaras.split('|')[0],download.urls.kara.local);
	const localSeriesPath = resolve(conf.appPath,conf.PathSeries.split('|')[0]);

	let bundle = {
		kara: localKara,
		series: []
	};

	const tempMedia = resolve(conf.appPath,conf.PathTemp,download.urls.media.local);
	const tempLyrics = resolve(conf.appPath,conf.PathTemp,download.urls.lyrics.local);
	const tempKara = resolve(conf.appPath,conf.PathTemp,download.urls.kara.local);
	const tempSeriesPath = resolve(conf.appPath,conf.PathTemp);
	list.push({
		filename: tempMedia,
		url: download.urls.media.remote
	});
	if (download.urls.lyrics.local !== 'dummy.ass') list.push({
		filename: tempLyrics,
		url: download.urls.lyrics.remote
	});
	list.push({
		filename: tempKara,
		url: download.urls.kara.remote,
	});
	for (const serie of download.urls.serie) {
		list.push({
			filename: resolve(tempSeriesPath, serie.local),
			url: serie.remote,
		});
		bundle.series.push(resolve(localSeriesPath, serie.local));
	}
	await downloadFiles(download, list);
	// Delete files if they're already present
	await asyncMove(tempMedia, localMedia, {overwrite: true});
	if (download.urls.lyrics.local !== 'dummy.ass') await asyncMove(tempLyrics, localLyrics, {overwrite: true});
	await asyncMove(tempKara, localKara, {overwrite: true});
	for (const seriefile of download.urls.serie) {
		await asyncMove(resolve(tempSeriesPath, seriefile.local), resolve(localSeriesPath, seriefile.local), {overwrite: true});
	}
	logger.info(`[Download] Finished downloading item "${download.name}"`);
	// Now adding our newly downloaded kara
	for (const serie of bundle.series) {
		await integrateSeriesFile(serie);
	}
	await integrateKaraFile(bundle.kara);
	logger.info(`[Download] Song "${download.name}" added to database`);

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
					}).catch((err) => {
						reject(`Error downloading this file : ${fileErrors.toString()} - setting failed status failed too! (${err})`);
					});
			} else {
				setDownloadStatus(download.uuid, 'DL_DONE')
					.then(() => {
						resolve();
					}).catch((err) => {
						reject(`Download finished but setting its state failed : ${err}`);
					});
			}
		});
	});
}

export function pauseQueue() {
	return q.pause();
}

export function resumeQueue() {
	return q.resume();
}

export async function addDownloads(repo, downloads) {
	const dls = downloads.map(dl => {
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
}

export async function removeDownload(uuid) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status !== 'DL_PLANNED') throw 'Only planned downloads can be cancelled';
	q.cancel(uuid);
	return await deleteDownload(uuid);
}

export async function wipeDownloads() {
	q.destroy();
	initQueue();
	return await emptyDownload();
}
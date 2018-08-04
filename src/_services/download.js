import {emptyDownload, selectDownload, selectDownloads, updateDownload, deleteDownload, insertDownloads, initDownloads} from '../_dao/download';
import Downloader from '../_common/utils/downloader';
import Queue from 'better-queue';
import uuidV4 from 'uuid/v4';
import {getConfig} from '../_common/utils/config';
import {resolve} from 'path';
import internet from 'internet-available';
import logger from 'winston';
import {asyncExists, asyncUnlink} from '../_common/utils/files';

const queueOptions = {
	id: 'uuid'
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

export async function initDownloadQueue() {
	q = new Queue(queueDownload, queueOptions);
	q.on('task_failed', (taskId, err, stats) => logger.error(`[Download] Task ${taskId} failed : ${err}`));
	q.on('drain', () => logger.info('[Download] Ano ne! I finished all my downloads! GIVE ME MORE!'));
	await initDownloads();
	return;
	const downloads = await selectDownloads();
	try {
		await internet();
		downloads.forEach(dl => q.push(dl));
	} catch(err) {
		if (downloads.length > 0) logger.warn('[Downloader] There are planned downloads, but your computer seems offline');
	}
}

async function processDownload(download) {
	const conf = getConfig();
	await setDownloadStatus(download.uuid, 'DL_RUNNING');
	let list = [];
	const localMedia = resolve(conf.appPath,conf.PathMedias.split('|')[0],download.urls.media.local);
	const localLyrics = resolve(conf.appPath,conf.PathSubs.split('|')[0],download.urls.lyrics.local);
	const localKara = resolve(conf.appPath,conf.PathKaras.split('|')[0],download.urls.kara.local);
	list.push({
		filename: localMedia,
		url: download.urls.media.remote
	});
	list.push({
		filename: localLyrics,
		url: download.urls.lyrics.remote
	});
	list.push({
		filename: localKara,
		url: download.urls.kara.remote
	});
	const downloader = new Downloader(list, {
		bar: true
	});
	// Delete files if they're already present
	if (await asyncExists(localMedia)) await asyncUnlink(localMedia);
	if (await asyncExists(localLyrics)) await asyncUnlink(localLyrics);
	if (await asyncExists(localKara)) await asyncUnlink(localKara);
	return new Promise((resolve, reject) => {
		downloader.download(fileErrors => {
			if (fileErrors.length > 0) {
				setDownloadStatus(download.uuid, 'DL_FAILED')
					.then(() => {
						reject(`Error downloading this file : ${fileErrors.toString()}`);
					}).catch((err) => {
						reject(`Error downloading this file : ${fileErrors.toString()} - setting failed status failed too!`);
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
				}
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

export async function removeDownload(uuid) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	dl.urls = JSON.parse(dl.urls);
	q.cancel(uuid);
	return await deleteDownload(uuid);
}

export async function wipeDownloads() {
	q.destroy();
	q = new Queue(queueDownload, queueOptions);
	return await emptyDownload();
}
import Queue from 'better-queue';
import internet from 'internet-available';
import {resolve} from 'path';
import { v4 as uuidV4 } from 'uuid';

import { APIMessage } from '../controllers/common';
import { compareKarasChecksum } from '../dao/database';
import {emptyDownload, initDownloads, insertDownloads, selectDownloads, selectPendingDownloads, updateDownload} from '../dao/download';
import { refreshAll, vacuum } from '../lib/dao/database';
import { DownloadBundle } from '../lib/types/downloads';
import {resolvedPathRepos, resolvedPathTemp} from '../lib/utils/config';
import {asyncCopy, asyncMove, asyncStat, asyncWriteFile,resolveFileInDirs} from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger from '../lib/utils/logger';
import { emit } from '../lib/utils/pubsub';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import { KaraDownload, KaraDownloadRequest, QueueStatus } from '../types/download';
import { DownloadItem } from '../types/downloader';
import Downloader from '../utils/downloader';
import { generateBlacklist } from './blacklist';
import { integrateKaraFile } from './karaManagement';
import { integrateTagFile } from './tag';

let downloaderReady = false;

const queueOptions = {
	id: 'uuid',
	cancelIfRunning: true,
	concurrent: 3
};

let q: any;
let downloadTask: Task;

export function getDownloadQueue() {
	return q;
}

function initTask() {
	downloadTask = new Task({
		text: 'DOWNLOADING'
	});
}

async function emitQueueStatus(status: QueueStatus) {
	emit('downloadQueueStatus', status);
	emitWS('downloadQueueStatus', await getDownloads());
}

function queueDownload(input: KaraDownload, done: any) {
	logger.info(`Processing song : ${input.name}`, {service: 'Download'});
	processDownload(input)
		.then(() => done())
		.catch(err => done(err));
}

export async function initDownloader() {
	if (!downloaderReady) {
		downloaderReady = true;
		initDownloadQueue();
		initDownloads();
	}
	return;
}


export function initDownloadQueue() {
	// We'll compare data dir checksum and execute refresh every 5 downloads and everytime the queue is drained
	let taskCounter = 0;
	let refreshing = false;
	q = new Queue(queueDownload, queueOptions);
	q.on('task_finish', () => {
		if (q.length > 0) logger.info(`${q.length - 1} items left in queue`, {service: 'Download'});
		taskCounter++;
		if (taskCounter >= 100 ) {
			logger.debug('Triggering database refresh', {service: 'Download'});
			compareKarasChecksum();
			refreshing = true;
			refreshAll().then(() => {
				refreshing = false;
				generateBlacklist();
			});
			taskCounter = 0;
		}
		emitQueueStatus('updated');
	});
	q.on('task_failed', (taskId: string, err: any) => {
		logger.error(`Task ${taskId} failed`, {service: 'Download', obj: err});
		emitQueueStatus('updated');
	});
	q.on('empty', () => emitQueueStatus('updated'));
	q.on('drain', async () => {
		logger.info('No tasks left, stopping queue', {service: 'Download'});
		if (!refreshing) {
			refreshAll().then(() => {
				generateBlacklist();
				vacuum();
			});
			await compareKarasChecksum();
		}
		taskCounter = 0;
		emitQueueStatus('updated');
		emitQueueStatus('stopped');
		emit('downloadQueueDrained');
		if (downloadTask) {
			downloadTask.end();
			downloadTask = null;
		}
	});
}

export async function startDownloads() {
	if (q) resumeQueue();
	if (q?.length === 0) {
		const downloads = await selectPendingDownloads();
		try {
			await internet();
			downloads.forEach(dl => q.push(dl));
			logger.info('Download queue starting up', {service: 'Downloader'});
			emitQueueStatus('started');
		} catch(err) {
			if (downloads.length > 0) logger.warn('There are planned downloads, but your computer seems offline', {service: 'Download'});
			emitQueueStatus('stopped');
		}
	}
}

export async function integrateDownloadBundle(bundle: DownloadBundle, download_id: string, destRepo?: string) {
	try {
		if (!downloadTask) initTask();
		downloadTask.update({
			subtext: bundle.kara.file,
			value: 0,
			total: bundle.kara.data.medias[0].filesize
		});
		const kara = bundle.kara;
		const lyrics = bundle.lyrics;
		const tags = bundle.tags;
		const list = [];
		const repository = kara.data.data.repository;
		if (!destRepo) {
			destRepo = repository;
		} else {
			// Redefine repo in files
			kara.data.data.repository = destRepo;
			for (const i in tags) {
				tags[i].data.tag.repository = destRepo;
			}
		}
		const mediaFile = kara.data.medias[0].filename;
		const localMedia = resolve(resolvedPathRepos('Medias', destRepo)[0], mediaFile);
		const localKaraPath = resolve(resolvedPathRepos('Karas', destRepo)[0]);
		const localTagsPath = resolve(resolvedPathRepos('Tags', destRepo)[0]);
		const localLyricsPath = resolve(resolvedPathRepos('Lyrics', destRepo)[0]);
		const tempDir = resolvedPathTemp();
		const tempMedia = resolve(tempDir, mediaFile);

		// Check if media already exists in any media dir. If it does, do not try to redownload it.
		let mediaAlreadyExists = false;
		try {
			const existingMediaFiles = await resolveFileInDirs(mediaFile, resolvedPathRepos('Medias', destRepo));
			// Check if file size are different
			const localMediaStat = await asyncStat(existingMediaFiles[0]);
			if (localMediaStat.size !== kara.data.medias[0].filesize) throw null;
			mediaAlreadyExists = true;
		} catch(err) {
			// File does not exist or sizes are different, we download it.
			list.push({
				filename: tempMedia,
				url: `https://${repository}/downloads/medias/${encodeURIComponent(mediaFile)}`,
				id: kara.file.replace('.kara.json','')
			});
		}
		if (list.length > 0) await downloadFiles(download_id, list, downloadTask);

		const writes = [];
		let tempLyrics: string;
		if (lyrics.file !== null) {
			tempLyrics = resolve(tempDir, lyrics.file);
			writes.push(asyncWriteFile(tempLyrics, lyrics.data, 'utf-8'));
		}
		const tempKara = resolve(tempDir, kara.file);
		writes.push(asyncWriteFile(tempKara, JSON.stringify(kara.data, null, 2), 'utf-8'));

		for (const tag of tags) {
			const tempTag = resolve(tempDir, tag.file);
			writes.push(asyncWriteFile(tempTag, JSON.stringify(tag.data, null, 2), 'utf-8'));
		}

		await Promise.all(writes);

		// Delete files if they're already present
		try {
			if (!mediaAlreadyExists) await asyncMove(tempMedia, localMedia, {overwrite: true});
		} catch(err) {
			logger.error(`Unable to move ${tempMedia} to ${localMedia}`, {service: 'Debug', obj: err});
		}
		try {
			if (lyrics.file !== null) await asyncMove(tempLyrics, resolve(localLyricsPath, lyrics.file), {overwrite: true});
		} catch(err) {
			logger.error(`Unable to move ${tempLyrics} to ${localLyricsPath}`, {service: 'Debug', obj: err});
		}
		try {
			await asyncMove(tempKara, resolve(localKaraPath, kara.file), {overwrite: true});
		} catch(err) {
			logger.error(`Unable to move ${tempKara} to ${localKaraPath}`, {service: 'Debug', obj: err});
		}
		for (const tag of tags) {
			try {
				// Tags are copied, not moved, becaue they can be used by several karas at once now that we use concurrent queue.
				await asyncCopy(resolve(tempDir, tag.file), resolve(localTagsPath, tag.file), {overwrite: true});
			} catch(err) {
				logger.error(`Unable to move ${resolve(tempDir, tag.file)} to ${resolve(localTagsPath, tag.file)}`, {service: 'Debug'});
			}
		}
		logger.info(`Finished downloading "${kara.file}"`, {service: 'Download'});
		// Now adding our newly downloaded kara
		await integrateDownload(bundle, localKaraPath, localTagsPath, download_id);
	} catch(err) {
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.DOWNLOAD', err));
	}
}
async function processDownload(download: KaraDownload) {
	try {
		await setDownloadStatus(download.uuid, 'DL_RUNNING');
		let bundle: DownloadBundle;
		try {
			const res = await HTTP.get(`https://${download.repository}/api/karas/${download.kid}/raw`);
			bundle = JSON.parse(res.body);
		} catch(err) {
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.DOWNLOAD', err));
			throw err;
		}
		await integrateDownloadBundle(bundle, download.uuid);
	} catch(err) {
		setDownloadStatus(download.uuid, 'DL_FAILED');
		throw err;
	} finally {
		if (downloadTask) downloadTask.update({
			subtext: download.name,
			value: download.size,
			total: download.size
		});
	}
}

async function integrateDownload(bundle: DownloadBundle, localKaraPath: string, localTagsPath: string, download_id: string ) {
	try {
		for (const tag of bundle.tags) {
			try {
				const tagName = await integrateTagFile(resolve(localTagsPath, tag.file));
				if (tagName) logger.debug(`Tag "${tagName}" in database`, {service: 'Download'});
			} catch(err) {
				logger.error(`Tag "${tag.file}" not properly added to database`, {service: 'Download', obj: err});
				throw err;
			}
		}
		try {
			await integrateKaraFile(resolve(localKaraPath, bundle.kara.file));
			logger.info(`Song "${bundle.kara.file}" added to database`, {service: 'Download'});
			await setDownloadStatus(download_id, 'DL_DONE');
		} catch(err) {
			logger.error(`Song "${bundle.kara.file}" not properly added to database`, {service: 'Download', obj: err});
			throw err;
		}
	} catch(err) {
		logger.error(`Song "${bundle.kara.file}" downloaded but not properly added to database. Regenerate your database manually after fixing errors`, {service: 'Download'});
		setDownloadStatus(download_id, 'DL_FAILED');
		throw err;
	}
}

export async function downloadFiles(download_id?: string, list?: DownloadItem[], task?: Task) {
	const downloader = new Downloader({task: task });
	// Launch downloads
	const fileErrors = await downloader.download(list);
	if (fileErrors.length > 0) {
		if (download_id) {
			await setDownloadStatus(download_id, 'DL_FAILED');
		}
		throw `Error downloading file : ${fileErrors.toString()}`;
	}
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

export async function addDownloads(downloads: KaraDownloadRequest[]): Promise<number> {
	const currentDls = await getDownloads();
	downloads = downloads.filter(dl => {
		if (currentDls.find(cdl => dl.name === cdl.name &&
			(cdl.status === 'DL_RUNNING' || cdl.status === 'DL_PLANNED')
		)
		) return false;
		return true;
	});
	if (downloads.length === 0) throw {code: 409, msg: 'DOWNLOADS_QUEUED_ALREADY_ADDED_ERROR'};
	const dls: KaraDownload[] = downloads.map(dl => {
		logger.debug(`Adding download ${dl.name}`, {service: 'Download'});
		return {
			uuid: uuidV4(),
			name: dl.name,
			size: dl.size,
			kid: dl.kid,
			status: 'DL_PLANNED',
			repository: dl.repository
		};
	});
	await insertDownloads(dls);
	dls.forEach(dl => q.push(dl));
	return dls.length;
}

export function getDownloads() {
	return selectDownloads();
}

export function setDownloadStatus(uuid: string, status: string) {
	return updateDownload(uuid, status);
}

export function wipeDownloadQueue() {
	if (q) q.destroy();
}

export function wipeDownloads() {
	wipeDownloadQueue();
	initDownloadQueue();
	emitQueueStatus('stopped');
	return emptyDownload();
}

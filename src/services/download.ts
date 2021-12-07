import Queue from 'better-queue';
import { promises as fs } from 'fs';
import internet from 'internet-available';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { APIMessage } from '../controllers/common';
import {
	initDownloads,
	insertDownloads,
	selectDownloads,
	truncateDownload,
	updateDownload,
	updateDownloaded,
} from '../dao/download';
import { getConfig, resolvedPath, resolvedPathRepos } from '../lib/utils/config';
import { resolveFileInDirs, smartMove } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import { emit } from '../lib/utils/pubsub';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import { KaraDownload, KaraDownloadRequest, QueueStatus } from '../types/download';
import { downloadFile } from '../utils/downloader';
import { getState } from '../utils/state';
import { getKaras } from './kara';
import { getRepoFreeSpace } from './repo';

export const downloadStatuses = ['MISSING', 'DOWNLOADING', 'DOWNLOADED'];

let downloaderReady = false;
let downloadQueueStatus: QueueStatus = 'stopped';

const downloadQueueOptions = {
	id: 'uuid',
	cancelIfRunning: true,
	concurrent: 3,
};

let dq: any;
let downloadedKIDs = new Set();

export function getDownloadQueueStatus() {
	return downloadQueueStatus;
}

export function getDownloadQueue() {
	return dq;
}

async function emitQueueStatus(status: QueueStatus) {
	downloadQueueStatus = status;
	emitWS('downloadQueueStatus', await getDownloads());
}

function queueDownload(input: KaraDownload, done: any) {
	processDownload(input)
		.then(() => done())
		.catch((err) => done(err));
}

export async function initDownloader() {
	profile('initDL');
	if (!downloaderReady) {
		downloaderReady = true;
		initDownloadQueue();
		initDownloads();
	}
	profile('initDL');
	return;
}

export function initDownloadQueue() {
	dq = new Queue(queueDownload, downloadQueueOptions);
	dq.on('task_finish', async () => {
		if (dq.length > 0) logger.info(`${dq.length - 1} items left in queue`, { service: 'Download' });
		emitQueueStatus('updated');
	});
	dq.on('task_failed', (taskId: string, err: any) => {
		logger.error(`Task ${taskId} failed`, { service: 'Download', obj: err });
		emitQueueStatus('updated');
	});
	dq.on('empty', () => emitQueueStatus('updated'));
	dq.on('drain', async () => {
		logger.info('No tasks left, stopping queue', { service: 'Download' });
		emitQueueStatus('updated');
		emitQueueStatus('stopped');
		emit('downloadQueueDrained');
		const karas = await getKaras({
			q: `k:${[...downloadedKIDs].join(',')}`,
		});
		downloadedKIDs = new Set();
		createImagePreviews(karas, 'single');
	});
}

export async function startDownloads() {
	if (dq) resumeQueue();
	if (dq?.length === 0) {
		const downloads = await selectDownloads(true);
		try {
			await internet();
			downloads.forEach((dl) => dq.push(dl));
			logger.info('Download queue starting up', { service: 'Downloader' });
			emitQueueStatus('started');
		} catch (err) {
			if (downloads.length > 0)
				logger.warn('There are planned downloads, but your computer seems offline', { service: 'Download' });
			emitQueueStatus('stopped');
		}
	}
}

async function processDownload(download: KaraDownload) {
	try {
		const freeSpace = await getRepoFreeSpace(download.repository);
		if (download.size > freeSpace) {
			logger.warn('Not enough free space for download, aborting', { service: 'Download' });
			emitWS('noFreeSpace');
			pauseQueue();
			throw 'No space left on device';
		}
		const downloadTask = new Task({
			text: 'DOWNLOADING',
			subtext: download.mediafile,
			value: 0,
			total: download.size,
		});
		setDownloadStatus(download.uuid, 'DL_RUNNING');
		updateDownloaded([download.kid], 'DOWNLOADING');
		emitWS('KIDUpdated', [{ kid: download.kid, download_status: 'DOWNLOADING' }]);
		const tempDir = resolvedPath('Temp');
		const localMedia = resolve(resolvedPathRepos('Medias', download.repository)[0], download.mediafile);
		const tempMedia = resolve(tempDir, download.mediafile);
		const downloadItem = {
			filename: tempMedia,
			url: `https://${download.repository}/downloads/medias/${encodeURIComponent(download.mediafile)}`,
			id: download.name,
		};
		await downloadFile(downloadItem, downloadTask);
		await smartMove(tempMedia, localMedia, { overwrite: true });
		setDownloadStatus(download.uuid, 'DL_DONE');
		logger.info(`Media "${download.name}" downloaded`, { service: 'Download' });
		await updateDownloaded([download.kid], 'DOWNLOADED');
		emitWS('KIDUpdated', [{ kid: download.kid, download_status: 'DOWNLOADED' }]);
		downloadTask.end();
		downloadedKIDs.add(download.kid);
	} catch (err) {
		setDownloadStatus(download.uuid, 'DL_FAILED');
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.DOWNLOAD', err));
		updateDownloaded([download.kid], 'MISSING');
		emitWS('KIDUpdated', [{ kid: download.kid, download_status: 'MISSING' }]);
		throw err;
	}
}

export function pauseQueue() {
	// Queue is paused but the current running task is not paused.
	emitQueueStatus('paused');
	return dq.pause();
}

export function resumeQueue() {
	emitQueueStatus('started');
	return dq.resume();
}

export async function checkMediaAndDownload(
	kid: string,
	mediafile: string,
	repo: string,
	mediasize: number,
	updateOnly = false
) {
	let downloadMedia = false;
	let mediaPath: string;
	try {
		mediaPath = (await resolveFileInDirs(mediafile, resolvedPathRepos('Medias', repo)))[0];
	} catch {
		// We're checking only to update files. If the file was never found, we won't try to download it. Else we do.
		if (updateOnly) return;
		downloadMedia = true;
	}
	if (mediaPath) {
		// File exists so we're checking for its stats to check if we need to redownload it or not (different sizes)
		const mediaStats = await fs.stat(mediaPath);
		downloadMedia = mediaStats.size !== mediasize;
	}
	if (downloadMedia && getConfig().Online.AllowDownloads && !getState().isTest) {
		try {
			await addDownloads([
				{
					mediafile: mediafile,
					name: mediafile,
					size: mediasize,
					repository: repo,
					kid: kid,
				},
			]);
		} catch (err) {
			// Non-fatal, probably the song is already in queue.
		}
	}
}

export async function addDownloads(downloads: KaraDownloadRequest[]): Promise<number> {
	const currentDls = await getDownloads();
	downloads = downloads.filter((dl) => {
		if (
			currentDls.find(
				(cdl) => dl.name === cdl.name && (cdl.status === 'DL_RUNNING' || cdl.status === 'DL_PLANNED')
			)
		)
			return false;
		return true;
	});
	if (downloads.length === 0) throw { code: 409, msg: 'DOWNLOADS_QUEUED_ALREADY_ADDED_ERROR' };
	const dls: KaraDownload[] = downloads.map((dl) => {
		logger.debug(`Adding download ${dl.name}`, { service: 'Download' });
		return {
			uuid: uuidV4(),
			name: dl.name,
			size: dl.size,
			mediafile: dl.mediafile,
			status: 'DL_PLANNED',
			repository: dl.repository,
			kid: dl.kid,
		};
	});
	await insertDownloads(dls);
	dls.forEach((dl) => dq.push(dl));
	return dls.length;
}

export function getDownloads() {
	return selectDownloads();
}

export function setDownloadStatus(uuid: string, status: string) {
	return updateDownload(uuid, status);
}

export function wipeDownloadQueue() {
	if (dq) dq.destroy();
}

export function wipeDownloads() {
	wipeDownloadQueue();
	initDownloadQueue();
	emitQueueStatus('stopped');
	return truncateDownload();
}

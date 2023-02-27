import { promise as fastq, queueAsPromised } from 'fastq';
import { promises as fs } from 'fs';
import internet from 'internet-available';
import parallel from 'p-map';
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
import { downloadFile } from '../lib/utils/downloader';
import { resolveFileInDirs, smartMove } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import { emit } from '../lib/utils/pubsub';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import { KaraDownload, KaraDownloadRequest, MediaDownloadCheck, QueueStatus } from '../types/download';
import { getState } from '../utils/state';
import { getKaras } from './kara';
import { getRepo, getRepoFreeSpace } from './repo';

const service = 'Downloads';

export const downloadStatuses = ['MISSING', 'DOWNLOADING', 'DOWNLOADED'];

let downloaderReady = false;
let downloadQueueStatus: QueueStatus = 'stopped';

const dq: queueAsPromised<KaraDownload, void> = fastq(processDownload, 3);
const downloadedKIDs = new Set();

export function getDownloadQueueStatus() {
	return downloadQueueStatus;
}

async function emitQueueStatus(status: QueueStatus) {
	downloadQueueStatus = status;
	emitWS('downloadQueueStatus', await getDownloads());
}

export async function initDownloader() {
	profile('initDL');
	if (!downloaderReady) {
		downloaderReady = true;
		initDownloadQueue();
		initDownloads();
	}
	profile('initDL');
}

export function initDownloadQueue() {
	dq.error((err, task: KaraDownload) => {
		if (err) {
			logger.error(`Download of ${task.mediafile} failed`, { service, obj: err });
		}
		emitQueueStatus('updated');
	});
	dq.empty = () => emitQueueStatus('updated');
	dq.drain = async () => {
		logger.info('No tasks left, stopping queue', { service });
		emitQueueStatus('updated');
		emitQueueStatus('stopped');
		emit('downloadQueueDrained');
		const karas = await getKaras({
			q: `k:${[...downloadedKIDs].join(',')}`,
			ignoreCollections: true,
		});
		downloadedKIDs.clear();
		createImagePreviews(karas, 'single').catch(() => {});
	};
}

export async function startDownloads() {
	if (dq) resumeQueue();
	if (dq?.length() === 0) {
		const downloads = await selectDownloads(true);
		try {
			await internet();
			downloads.forEach(dl => dq.push(dl));
			logger.info('Download queue starting up', { service });
			emitQueueStatus('started');
		} catch (err) {
			if (downloads.length > 0) {
				logger.warn('There are planned downloads, but your computer seems offline', { service });
			}
			emitQueueStatus('stopped');
		}
	}
}

async function processDownload(download: KaraDownload) {
	try {
		const freeSpace = await getRepoFreeSpace(download.repository);
		if (freeSpace != null && download.size > freeSpace) {
			logger.warn('Not enough free space for download, aborting', { service });
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
		logger.info(`Media "${download.name}" downloaded`, { service });
		await updateDownloaded([download.kid], 'DOWNLOADED');
		emitWS('KIDUpdated', [{ kid: download.kid, download_status: 'DOWNLOADED' }]);
		downloadTask.end();
		downloadedKIDs.add(download.kid);
		if (dq.length() > 0) logger.info(`${dq.length() - 1} items left in queue`, { service });
		emitQueueStatus('updated');
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

export async function checkMediaAndDownload(plcs: MediaDownloadCheck[], updateOnly = false) {
	const mapper = async (plc: MediaDownloadCheck) => {
		return checkMediaAndDownloadSingleKara(plc, updateOnly);
	};
	await parallel(plcs, mapper, {
		stopOnError: false,
		concurrency: 32,
	});
}

export async function checkMediaAndDownloadSingleKara(kara: MediaDownloadCheck, updateOnly = false) {
	let downloadMedia = false;
	let mediaPath: string;
	try {
		mediaPath = (await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0];
	} catch {
		// We're checking only to update files. If the file was never found, we won't try to download it. Else we do.
		if (updateOnly) return;
		downloadMedia = true;
	}
	if (mediaPath) {
		// File exists so we're checking for its stats to check if we need to redownload it or not (different sizes)
		const mediaStats = await fs.stat(mediaPath);
		downloadMedia = mediaStats.size !== kara.mediasize;
	}
	const repo = getRepo(kara.repository);
	if (downloadMedia && getConfig().Online.AllowDownloads && !getState().isTest && repo.Online) {
		try {
			await addDownloads([
				{
					mediafile: kara.mediafile,
					name: kara.mediafile,
					size: kara.mediasize,
					repository: kara.repository,
					kid: kara.kid,
				},
			]);
		} catch (err) {
			// Non-fatal, probably the song is already in queue.
		}
	}
}

export async function addDownloads(downloads: KaraDownloadRequest[]): Promise<number> {
	const currentDls = await getDownloads();
	const downloadsFiltered = downloads.filter(dl => {
		if (
			currentDls.find(cdl => dl.name === cdl.name && (cdl.status === 'DL_RUNNING' || cdl.status === 'DL_PLANNED'))
		) {
			return false;
		}
		return true;
	});
	if (downloadsFiltered.length === 0) throw { code: 409, msg: 'DOWNLOADS_QUEUED_ALREADY_ADDED_ERROR' };
	const dls: KaraDownload[] = downloadsFiltered.map(dl => {
		logger.debug(`Adding download ${dl.name}`, { service });
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
	dls.forEach(dl => dq.push(dl));
	return dls.length;
}

export function getDownloads() {
	return selectDownloads();
}

export function setDownloadStatus(uuid: string, status: string) {
	return updateDownload(uuid, status);
}

export function wipeDownloadQueue() {
	if (dq) dq.killAndDrain();
}

export function wipeDownloads() {
	wipeDownloadQueue();
	initDownloadQueue();
	emitQueueStatus('stopped');
	return truncateDownload();
}

import { promises as fs } from 'fs';
import { resolve } from 'path';
import prettyBytes from 'pretty-bytes';

import { APIMessage } from '../lib/services/frontend';
import { DBKara } from '../lib/types/database/kara';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import { mediaFileRegexp } from '../lib/utils/constants';
import { resolveFileInDirs } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import { File } from '../types/download';
import Downloader from '../utils/downloader';
import { checkDownloadStatus } from './repo';

let updateRunning = false;

async function getRemoteMedias(repo: string): Promise<DBKara[]> {
	const res = await HTTP.get(`https://${repo}/api/karas/medias`);
	return JSON.parse(res.body);
}

async function listRemoteMedias(repo: string): Promise<File[]> {
	logger.info('Fetching current media list', {service: 'Update'});
	profile('listRemoteMedias');
	const remote = await getRemoteMedias(repo);
	profile('listRemoteMedias');
	return remote.map(m => {
		return {
			basename: m.mediafile,
			size: m.mediasize
		};
	});
}

async function compareMedias(localFiles: File[], remoteFiles: File[], repo: string, updateOnly = false): Promise<boolean> {
	const removedFiles:string[] = [];
	const addedFiles:File[] = [];
	const updatedFiles:File[] = [];
	const mediasPath = resolvedPathRepos('Medias', repo)[0];
	logger.info('Comparing your medias with the current ones', {service: 'Update'});
	for (const remoteFile of remoteFiles) {
		const localFile = localFiles.find(f => f.basename === remoteFile.basename);
		if (localFile) {
			if (remoteFile.size !== localFile.size) {
				updatedFiles.push(remoteFile);
			}
			// Do nothing if file exists and sizes are the same
		} else {
			if (!updateOnly) addedFiles.push(remoteFile);
		}
	}

	if (!updateOnly) {
		for (const localFile of localFiles) {
			const remoteFilePresent = remoteFiles.find(remoteFile => localFile.basename === remoteFile.basename);
			if (!remoteFilePresent) removedFiles.push(localFile.basename);
		}
	}
	// Remove files to update to start over their download
	for (const file of updatedFiles) {
		await fs.unlink(resolve(mediasPath, file.basename));
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.basename > b.basename) ? 1 : ((b.basename > a.basename) ? -1 : 0);
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`, {service: 'Update'});
		await downloadMedias(filesToDownload, mediasPath, repo);
		logger.info('Done updating medias', {service: 'Update'});
		return true;
	} else {
		logger.info('No new medias to download', {service: 'Update'});
		return false;
	}
}

async function downloadMedias(files: File[], mediasPath: string, repo: string): Promise<void> {
	const list = [];
	for (const file of files) {
		list.push({
			filename: resolve(mediasPath, file.basename),
			url: `https://${repo}/downloads/medias/${encodeURIComponent(file.basename)}`,
			size: file.size
		});
	}
	const downloadTask = new Task({
		text: 'DOWNLOADING_MEDIAS',
		value: 0,
		total: files.length
	});
	const mediaDownloads = new Downloader({
		task: downloadTask
	});
	const fileErrors = await mediaDownloads.download(list);
	downloadTask.end();
	if (fileErrors.length > 0) {
		throw (`Error downloading these medias : ${fileErrors.toString()}`);
	}
}

async function listLocalMedias(repo: string): Promise<File[]> {
	profile('listLocalMedias');
	const mediaFiles = await fs.readdir(resolvedPathRepos('Medias', repo)[0]);
	const localMedias = [];
	for (const file of mediaFiles) {
		try {
			if (!file.match(mediaFileRegexp)) continue;
			const mediaPath = await resolveFileInDirs(file, resolvedPathRepos('Medias', repo));
			const mediaStats = await fs.stat(mediaPath[0]);
			localMedias.push({
				basename: file,
				size: mediaStats.size
			});
		} catch {
			logger.info(`Local media file ${file} not found`, {service: 'Update'});
		}
	}
	logger.debug('Listed local media files', {service: 'Update'});
	profile('listLocalMedias');
	return localMedias;
}

async function removeFiles(files: string[], dir: string): Promise<void> {
	for (const file of files) {
		await fs.unlink(resolve(dir, file));
		logger.info('Removed', {service: 'Update', obj: file});
	}
}

/** Updates medias for all repositories */
export async function updateAllMedias() {
	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Updating medias from repository ${repo.Name}`, {service: 'Update'});
			await updateMedias(repo.Name);
		} catch(err) {
			logger.warn(`Repository ${repo.Name} failed to update medias properly`, {service: 'Update', obj: err});
			emitWS('operatorNotificationError', APIMessage('ERROR_CODES.UPDATING_MEDIAS_ERROR', repo.Name));
		}
	}
	await checkDownloadStatus();
}

/** Update medias for one repository */
export async function updateMedias(repo: string): Promise<boolean> {
	if (updateRunning) throw {code: 409, msg: 'An update is already running, please wait for it to finish.'};
	updateRunning = true;
	const task = new Task({
		text: 'UPDATING_MEDIAS',
		subtext: repo
	});
	try {
		const [remoteMedias, localMedias] = await Promise.all([
			listRemoteMedias(repo),
			listLocalMedias(repo)
		]);
		const updateVideos = await compareMedias(localMedias, remoteMedias, repo);

		updateRunning = false;
		return !!updateVideos;
	} catch (err) {
		updateRunning = false;
		throw err;
	} finally {
		task.end();
	}
}
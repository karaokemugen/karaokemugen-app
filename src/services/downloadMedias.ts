import { promises as fs } from 'fs';
import { resolve } from 'path';
import prettyBytes from 'pretty-bytes';

import { APIMessage } from '../lib/services/frontend.js';
import { DBMedia } from '../lib/types/database/kara.js';
import { getConfig, resolvedPathRepos } from '../lib/utils/config.js';
import { mediaFileRegexp } from '../lib/utils/constants.js';
import { resolveFileInDirs } from '../lib/utils/files.js';
import HTTP from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import { on } from '../lib/utils/pubsub.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { File } from '../types/download.js';
import Sentry from '../utils/sentry.js';
import { addDownloads } from './download.js';
import { checkDownloadStatus, checkRepoMediaPaths, getRepo } from './repo.js';

const service = 'MediasUpdater';

let updateRunning = false;

async function getRemoteMedias(repoName: string) {
	const collections = getConfig().Karaoke.Collections;
	const enabledCollections = [];
	const repo = getRepo(repoName);
	for (const collection of Object.keys(collections)) {
		if (collections[collection] === true) enabledCollections.push(collection);
	}
	const res = await HTTP.post(`${repo.Secure ? 'https' : 'http'}://${repoName}/api/karas/medias`, {
		collections: enabledCollections,
	});
	return res.data as DBMedia[];
}

async function listRemoteMedias(repo: string) {
	logger.info('Fetching current media list', { service });
	profile('listRemoteMedias');
	const remote = await getRemoteMedias(repo);
	profile('listRemoteMedias');
	return remote;
}

async function compareMedias(
	localFiles: File[],
	remoteKaras: DBMedia[],
	repo: string,
	updateOnly = false
): Promise<boolean> {
	const removedFiles: string[] = [];
	const addedFiles: DBMedia[] = [];
	const updatedFiles: DBMedia[] = [];
	const mediasPath = resolvedPathRepos('Medias', repo)[0];
	logger.info('Comparing your medias with the current ones', { service });
	for (const remoteKara of remoteKaras) {
		const localFile = localFiles.find(f => f.basename === remoteKara.mediafile);
		if (localFile) {
			if (remoteKara.mediasize !== localFile.size) {
				updatedFiles.push(remoteKara);
			}
			// Do nothing if file exists and sizes are the same
		} else if (!updateOnly) addedFiles.push(remoteKara);
	}

	if (!updateOnly) {
		for (const localFile of localFiles) {
			const remoteFilePresent = remoteKaras.find(remoteKara => localFile.basename === remoteKara.mediafile);
			if (!remoteFilePresent) removedFiles.push(localFile.basename);
		}
	}
	// Remove files to update to start over their download
	for (const file of updatedFiles) {
		await fs.unlink(resolve(mediasPath, file.mediafile));
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a, b) => {
			return a.mediafile > b.mediafile ? 1 : b.mediafile > a.mediafile ? -1 : 0;
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload += file.mediasize;
		}
		logger.info(
			`Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`,
			{ service }
		);
		await downloadMedias(filesToDownload);
		logger.info('Done updating medias', { service });
		return true;
	}
	logger.info('No new medias to download', { service });
	return false;
}

async function downloadMedias(karas: DBMedia[]): Promise<void> {
	try {
		await addDownloads(
			karas.map(k => {
				return {
					mediafile: k.mediafile,
					name: k.songname,
					size: k.mediasize,
					repository: k.repository,
					kid: k.kid,
				};
			})
		);
	} catch (err) {
		// If 409ed, no download was added, they're all in the list already and will be downloaded shortly. Hopefully.
		if (err.code === 409) return;
		throw err;
	}
	return new Promise(resolvePromise => {
		on('downloadQueueDrained', () => {
			resolvePromise();
		});
	});
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
				size: mediaStats.size,
			});
		} catch {
			logger.info(`Local media file ${file} not found`, { service });
		}
	}
	logger.debug('Listed local media files', { service });
	profile('listLocalMedias');
	return localMedias;
}

async function removeFiles(files: string[], dir: string): Promise<void> {
	for (const file of files) {
		await fs.unlink(resolve(dir, file));
		logger.info('Removed', { service, obj: file });
	}
}

/** Updates medias for all repositories */
export async function updateAllMedias() {
	const checkMediaPathErrors = checkRepoMediaPaths();
	if (checkMediaPathErrors.reposWithSameMediaPath.length > 0) {
		logger.error(
			`Multiple repositories share the same media path, which will cause sync errors: ${checkMediaPathErrors.reposWithSameMediaPathText}`,
			{ service }
		);
		emitWS(
			'operatorNotificationError',
			APIMessage('ERROR_CODES.UPDATING_MEDIAS_MULTIPLE_USED_MEDIA_PATH_ERROR', {
				repos: checkMediaPathErrors.reposWithSameMediaPathText,
			})
		);
		return;
	}

	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Updating medias from repository ${repo.Name}`, { service });
			await updateMedias(repo.Name);
		} catch (err) {
			logger.warn(`Repository ${repo.Name} failed to update medias properly`, { service, obj: err });
			Sentry.error(err);
			emitWS(
				'operatorNotificationError',
				APIMessage('ERROR_CODES.UPDATING_MEDIAS_ERROR', { repo: repo.Name, err: err })
			);
		}
	}
	await checkDownloadStatus();
}

/** Update medias for one repository */
export async function updateMedias(repo: string): Promise<boolean> {
	if (updateRunning) throw { code: 409, msg: 'An update is already running, please wait for it to finish.' };
	updateRunning = true;
	const task = new Task({
		text: 'UPDATING_MEDIAS',
		subtext: repo,
	});
	try {
		const [remoteMedias, localMedias] = await Promise.all([listRemoteMedias(repo), listLocalMedias(repo)]);
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

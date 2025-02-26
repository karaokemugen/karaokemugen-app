import { promises as fs } from 'fs';
import parallel from 'p-map';
import { resolve } from 'path';
import prettyBytes from 'pretty-bytes';

import { APIMessage } from '../lib/services/frontend.js';
import { DBMedia } from '../lib/types/database/kara.js';
import { getConfig, resolvedPathRepos } from '../lib/utils/config.js';
import { mediaFileRegexp } from '../lib/utils/constants.js';
import { ErrorKM } from '../lib/utils/error.js';
import HTTP from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import { on } from '../lib/utils/pubsub.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { UpdateMediasResult } from '../types/download.js';
import Sentry from '../utils/sentry.js';
import { addDownloads } from './download.js';
import { checkDownloadStatus, checkRepoMediaPaths, getRepo, getRepos } from './repo.js';

const service = 'MediasUpdater';

let updateRunning = false;

async function getRemoteMedias(repoName: string) {
	const collections = getConfig().Karaoke.Collections;
	const enabledCollections = [];
	const repo = getRepo(repoName);
	if (collections)
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
	localFiles: Map<string, number>,
	remoteKaras: DBMedia[],
	repo: string,
	dryRun = false
): Promise<UpdateMediasResult> {
	const removedFiles: string[] = [];
	const addedFiles: DBMedia[] = [];
	const updatedFiles: DBMedia[] = [];
	const mediasPath = resolvedPathRepos('Medias', repo)[0];
	logger.info('Comparing your medias with the current ones', { service });
	for (const remoteKara of remoteKaras) {
		const localSize = localFiles.get(remoteKara.mediafile);
		if (localSize) {
			if (remoteKara.mediasize !== localSize) {
				updatedFiles.push(remoteKara);
			}
			// Do nothing if file exists and sizes are the same
		} else {
			addedFiles.push(remoteKara);
		}
	}

	for (const localFile of localFiles.keys()) {
		const remoteFilePresent = remoteKaras.find(remoteKara => localFile === remoteKara.mediafile);
		if (!remoteFilePresent) removedFiles.push(localFile);
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	let bytesToDownload = 0;
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a, b) => {
			return a.mediafile > b.mediafile ? 1 : b.mediafile > a.mediafile ? -1 : 0;
		});
		for (const file of filesToDownload) {
			bytesToDownload += file.mediasize;
		}
		logger.info(`Removing ${removedFiles.length} files`, { service });
		logger.info(
			`Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`,
			{ service }
		);
	} else {
		logger.info('No new medias to download', { service });
	}
	if (dryRun) {
		logger.info('Dry run enabled - no action taken', { service });
	} else {
		// Remove files to update to start over their download
		for (const file of updatedFiles) {
			await fs.unlink(resolve(mediasPath, file.mediafile));
		}
		if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
		if (filesToDownload.length > 0) await downloadMedias(filesToDownload);
		logger.info('Done updating medias', { service });
	}
	return {
		removedFiles,
		addedFiles,
		updatedFiles,
		repoName: repo,
		bytesToDownload,
	};
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

async function listLocalMedias(repo: string): Promise<Map<string, number>> {
	profile('listLocalMedias');
	const mediaDir = resolvedPathRepos('Medias', repo)[0];
	const mediaFiles = await fs.readdir(mediaDir);
	const localMedias: Map<string, number> = new Map();
	const mapper = async (file: string) => {
		const mediaPath = resolve(mediaDir, file);
		if (!file.match(mediaFileRegexp)) return undefined;
		return {
			file,
			size: (await fs.stat(mediaPath)).size,
		};
	};
	profile('listLocalMedias-mapper');
	const files = await parallel(mediaFiles, mapper, {
		stopOnError: false,
		concurrency: 128,
	});
	profile('listLocalMedias-mapper');
	profile('listLocalMedias-buildMap');
	for (const file of files) {
		localMedias.set(file.file, file.size);
	}
	profile('listLocalMedias-buildMap');
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
export async function updateAllMedias(repoNames?: string[], dryRun = false): Promise<UpdateMediasResult[]> {
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

	const results = [];
	for (const repo of getRepos(repoNames).filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Updating medias from repository ${repo.Name}`, { service });
			results.push(await updateMedias(repo.Name, dryRun));
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
	return results;
}

/** Update medias for one repository */
export async function updateMedias(repo: string, dryRun = false): Promise<UpdateMediasResult> {
	const task = new Task({
		text: 'UPDATING_MEDIAS',
		subtext: repo,
	});
	if (updateRunning) throw new ErrorKM('ERROR_CODES.UPDATE_REPO_ALREADY_IN_PROGRESS', 409);
	updateRunning = true;
	try {
		const [remoteMedias, localMedias] = await Promise.all([listRemoteMedias(repo), listLocalMedias(repo)]);
		const updateVideos = await compareMedias(localMedias, remoteMedias, repo, dryRun);
		return updateVideos;
	} catch (err) {
		throw err;
	} finally {
		updateRunning = false;
		task.end();
	}
}

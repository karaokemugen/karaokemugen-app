import { promises as fs } from 'fs';
import { remove } from 'fs-extra';
import { cloneDeep, sample } from 'lodash';
import { basename, resolve } from 'path';
import prettyBytes from 'pretty-bytes';

import { PlaylistMedia, PlaylistMediaFile, PlaylistMedias, PlaylistMediaType } from '../lib/types/playlistMedias.js';
import { getConfig } from '../lib/utils/config.js';
import { downloadFiles } from '../lib/utils/downloader.js';
import { asyncCheckOrMkdir, isMediaFile } from '../lib/utils/files.js';
import HTTP, { fixedEncodeURIComponent } from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { Config } from '../types/config.js';
import { editSetting, resolvedMediaPath } from '../utils/config.js';

const service = 'PlaylistMedias';

const medias: PlaylistMedias = {
	Intros: [],
	Outros: [],
	Encores: [],
	Jingles: [],
	Sponsors: [],
};

const currentMedias: Partial<PlaylistMedias> = {};

export async function buildAllMediasList() {
	for (const type of Object.keys(medias)) {
		await buildMediasList(type as PlaylistMediaType);
		// Failure is non-fatal
	}
}

export async function updatePlaylistMedias() {
	const updates = getConfig().Online.Updates.Medias;
	const task = new Task({
		text: 'UPDATING_PLMEDIAS',
	});
	for (const type of Object.keys(updates)) {
		task.update({
			subtext: type,
		});
		if (updates[type]) await updateMediasHTTP(type as PlaylistMediaType, task).catch(() => {});
		// Failure is non-fatal
	}
	task.end();
}

async function listRemoteMedias(type: PlaylistMediaType): Promise<PlaylistMediaFile[]> {
	try {
		const res = await HTTP.get(`https://${getConfig().Online.Host}/api/playlistMedias/${type}`);
		return res.data as PlaylistMediaFile[];
	} catch (err) {
		logger.warn(`Unable to fetch remote playlist medias list : ${err}`, { service, obj: err });
	}
}

async function listLocalFiles(dir: string): Promise<PlaylistMediaFile[]> {
	const localFiles = await fs.readdir(dir);
	const files = [];
	for (const file of localFiles) {
		const fstat = await fs.stat(resolve(dir, file));
		files.push({
			basename: file,
			size: fstat.size,
		});
	}
	return files;
}

async function removeFiles(files: string[], dir: string) {
	for (const file of files) {
		await remove(resolve(dir, file));
		logger.info(`Removed : ${file}`, { service });
	}
}

export async function updateMediasHTTP(type: PlaylistMediaType, task: Task) {
	try {
		const remoteFiles = await listRemoteMedias(type);
		const localDir = resolve(resolvedMediaPath(type)[0], 'KaraokeMugen/');
		await asyncCheckOrMkdir(localDir);
		// Setting additional path if it doesn't exist in config (but it should if you used the defaults)
		const conf = getConfig();
		const slash = process.platform === 'win32' ? '\\' : '/';
		if (!conf.System.MediaPath[type].includes(`${conf.System.MediaPath[type][0] + slash}KaraokeMugen`)) {
			conf.System.MediaPath[type].push(`${conf.System.MediaPath[type][0] + slash}KaraokeMugen`);
			const ConfigPart: Partial<Config> = {};
			ConfigPart.System.MediaPath[type] = conf.System.MediaPath[type];
			editSetting(ConfigPart);
		}
		const localFiles = await listLocalFiles(localDir);
		const removedFiles: PlaylistMediaFile[] = [];
		const addedFiles: PlaylistMediaFile[] = [];
		const updatedFiles: PlaylistMediaFile[] = [];
		for (const remoteFile of remoteFiles) {
			const filePresent = localFiles.some(localFile => {
				if (localFile.basename === remoteFile.basename) {
					if (localFile.size !== remoteFile.size) updatedFiles.push(remoteFile);
					return true;
				}
				return false;
			});
			if (!filePresent) addedFiles.push(remoteFile);
		}
		for (const localFile of localFiles) {
			const filePresent = remoteFiles.some(remoteFile => {
				return localFile.basename === remoteFile.basename;
			});
			if (!filePresent) removedFiles.push(localFile);
		}
		// Remove files to update to start over their download
		for (const file of updatedFiles) {
			await remove(resolve(localDir, file.basename));
		}
		const filesToDownload = addedFiles.concat(updatedFiles);
		if (removedFiles.length > 0) {
			await removeFiles(
				removedFiles.map(f => f.basename),
				localDir
			);
		}
		if (filesToDownload.length > 0) {
			filesToDownload.sort((a, b) => {
				return a.basename > b.basename ? 1 : b.basename > a.basename ? -1 : 0;
			});
			let bytesToDownload = 0;
			for (const file of filesToDownload) {
				bytesToDownload += file.size;
			}
			logger.info(
				`Downloading ${filesToDownload.length} new/updated ${type} medias (size : ${prettyBytes(
					bytesToDownload
				)})`,
				{ service }
			);
			await downloadMedias(filesToDownload, localDir, type, task);
			logger.info(`Update for ${type} done`, { service });
		}
	} catch (err) {
		logger.warn(`Failed to update ${type} medias`, { service, obj: err });
	}
}

async function downloadMedias(files: PlaylistMediaFile[], dir: string, type: PlaylistMediaType, task: Task) {
	const list = files.map(file => {
		return {
			filename: resolve(dir, file.basename),
			url: `https://${getConfig().Online.Host}/playlistMedias/${type}/${fixedEncodeURIComponent(file.basename)}`,
			size: file.size,
		};
	});
	const fileErrors = await downloadFiles(list, task);
	if (fileErrors.length > 0) {
		throw `Error downloading these medias: ${fileErrors.map(err => basename(err)).toString()}`;
	}
	task.end();
}

export async function buildMediasList(type: PlaylistMediaType) {
	medias[type] = [];
	for (const resolvedPath of resolvedMediaPath(type)) {
		const files = [];
		const dirFiles = await fs.readdir(resolvedPath);
		for (const file of dirFiles) {
			const fullFilePath = resolve(resolvedPath, file);
			if (isMediaFile(file)) {
				files.push({
					type,
					filename: fullFilePath,
					series: file.split(' - ')[0],
				});
			}
		}
		medias[type] = files;
	}
	currentMedias[type] = cloneDeep(medias[type]);
}

export function getSingleMedia(type: PlaylistMediaType): PlaylistMedia | null {
	// If no medias exist, return null.
	if (!medias[type] || medias[type]?.length === 0) {
		return null;
	}
	if (currentMedias[type]?.length === 0) {
		// If our current files list is empty after the previous removal
		// Fill it again with the original list.
		currentMedias[type] = cloneDeep(medias[type]);
	}
	// Pick a media from a random series
	let media: PlaylistMedia | null = null;
	media = sample(currentMedias[type]);
	// Let's remove the series of the jingle we just selected so it won't be picked again next time.
	currentMedias[type] = currentMedias[type].filter(m => m.series !== media.series);
	logger.info(`${type} time !`, { service });
	return media;
}

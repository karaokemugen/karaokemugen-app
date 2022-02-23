import { promises as fs } from 'fs';
import { remove } from 'fs-extra';
import { cloneDeep, sample } from 'lodash';
import { basename, resolve } from 'path';
import prettyBytes from 'pretty-bytes';
import { createClient, FileStat } from 'webdav';

import { getConfig } from '../lib/utils/config';
import { downloadFiles } from '../lib/utils/downloader';
import { asyncCheckOrMkdir, isMediaFile } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { Config } from '../types/config';
import { Media, MediaType } from '../types/medias';
import { editSetting, resolvedMediaPath } from '../utils/config';
import { playlistMediasURL } from '../utils/constants';

interface File {
	basename: string;
	size: number;
}

type Medias = {
	[key in MediaType]: Media[];
};

const medias: Medias = {
	Intros: [],
	Outros: [],
	Encores: [],
	Jingles: [],
	Sponsors: [],
};

const currentMedias: Partial<Medias> = {};

export async function buildAllMediasList() {
	for (const type of Object.keys(medias)) {
		await buildMediasList(type as MediaType);
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
		if (updates[type]) await updateMediasHTTP(type as MediaType, task).catch(() => {});
		// Failure is non-fatal
	}
	task.end();
}

async function listRemoteMedias(type: MediaType): Promise<FileStat[]> {
	const webdavClient = createClient(playlistMediasURL);
	return (await webdavClient.getDirectoryContents(`/${type}`)) as FileStat[];
}

async function listLocalFiles(dir: string): Promise<FileStat[]> {
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
		logger.info(`Removed : ${file}`, { service: 'Medias' });
	}
}

export async function updateMediasHTTP(type: MediaType, task: Task) {
	try {
		const remoteFiles: FileStat[] = await listRemoteMedias(type);
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
		const removedFiles: FileStat[] = [];
		const addedFiles: FileStat[] = [];
		const updatedFiles: FileStat[] = [];
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
				`Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`,
				{ service: type }
			);
			await downloadMedias(filesToDownload, localDir, type, task);
			logger.info('Update done', { service: type });
		}
	} catch (err) {
		logger.warn('Failed to update medias', { service: type, obj: err });
	}
}

async function downloadMedias(files: File[], dir: string, type: MediaType, task: Task) {
	const list = files.map(file => {
		return {
			filename: resolve(dir, file.basename),
			url: `${playlistMediasURL}/${type}/${encodeURIComponent(file.basename)}`,
			size: file.size,
		};
	});
	const fileErrors = await downloadFiles(list, task);
	if (fileErrors.length > 0) {
		throw `Error downloading these medias: ${fileErrors.map(err => basename(err)).toString()}`;
	}
	task.end();
}

export async function buildMediasList(type: MediaType) {
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

export function getSingleMedia(type: MediaType): Media | null {
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
	let media: Media | null = null;
	let fromConfig = false;
	if (type === 'Jingles' || type === 'Sponsors') {
		// Jingles and sponsors do not have a specific file to use in options
		media = sample(currentMedias[type]);
	} else {
		// For every other media type we pick the file from config if it's specified.
		const configCandidate = currentMedias[type].find(
			(m: Media) => basename(m.filename) === getConfig().Playlist.Medias[type].File
		);
		if (configCandidate) {
			fromConfig = true;
		}
		media = configCandidate || sample(currentMedias[type]);
	}
	// Let's remove the series of the jingle we just selected so it won't be picked again next time.
	if (!fromConfig) currentMedias[type] = currentMedias[type].filter(m => m.series !== media.series);
	logger.info(`${type} time !`, { service: 'Player' });
	return media;
}

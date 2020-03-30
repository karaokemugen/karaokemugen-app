import {extractMediaFiles, asyncReadDir, asyncStat, asyncCheckOrMkdir, asyncRemove} from '../lib/utils/files';
import {resolve} from 'path';
import {getConfig, resolvedPathIntros, resolvedPathOutros, resolvedPathEncores, resolvedPathJingles, resolvedPathSponsors} from '../lib/utils/config';
import logger from '../lib/utils/logger';
import sample from 'lodash.sample';
import { Media, MediaType } from '../types/medias';
import { editSetting } from '../utils/config';
import cloneDeep from 'lodash.clonedeep';
import Task from '../lib/utils/taskManager';
import {createClient} from 'webdav';
import prettyBytes from 'pretty-bytes';
import Downloader from '../utils/downloader';

const medias = {
	Intros: [] as Media[],
	Outros: [] as Media[],
	Encores: [] as Media[],
	Jingles: [] as Media[],
	Sponsors: [] as Media[],
};

interface File {
	basename: string,
	size: number
}

const currentMedias = {};

const KMSite = {
	url: 'http://mugen.karaokes.moe/medias/',
	username: 'km',
	password: 'musubi'
}

export async function buildAllMediasList() {
	const medias = getConfig().Playlist.Medias;
	for (const type of Object.keys(medias)){
		try {
			await buildMediasList(type as MediaType);
		} catch(err) {
			//Non fatal
		}
	}
}

export async function updatePlaylistMedias() {
	const updates = getConfig().Online.Updates.Medias;
	const task = new Task({
		text: 'UPDATING_PLMEDIAS'
	});
	for (const type of Object.keys(updates)){
		try {
			task.update({
				subtext: type
			});
			if (updates[type]) await updateMediasHTTP(type as MediaType, task);
		} catch(err) {
			//Non fatal
		}
	}
	task.end();
}

function resolveMediaPath(type: MediaType): string[] {
	if (type === 'Intros') return resolvedPathIntros();
	if (type === 'Outros') return resolvedPathOutros();
	if (type === 'Encores') return resolvedPathEncores();
	if (type === 'Jingles') return resolvedPathJingles();
	if (type === 'Sponsors') return resolvedPathSponsors();
}

async function listRemoteMedias(type: MediaType): Promise<File[]> {
	let webdavClient = createClient(
		KMSite.url,
		{
			username: KMSite.username,
			password: KMSite.password
		}
	);
	const contents = await webdavClient.getDirectoryContents('/' + type);
	webdavClient = null;
	return contents;
}

async function listLocalFiles(dir: string): Promise<File[]> {
	const localFiles = await asyncReadDir(dir);
	const files = [];
	for (const file of localFiles) {
		const stat = await asyncStat(resolve(dir, file));
		files.push({
			basename: file,
			size: stat.size
		});
	}
	return files;
}

async function removeFiles(files: string[], dir: string) {
	for (const file of files) {
		await asyncRemove(resolve(dir, file));
		logger.info(`[Medias] Removed : ${file}`);
	}
}

export async function updateMediasHTTP(type: MediaType, task: Task) {
	try {
		const remoteFiles = await listRemoteMedias(type);
		const localDir = resolve(resolveMediaPath(type)[0], 'KaraokeMugen/');
		await asyncCheckOrMkdir(localDir);
		// Setting additional path if it doesn't exist in config (but it should if you used the defaults)
		const conf = getConfig();
		if (!conf.System.Path[type].includes(conf.System.Path[type][0] + '/KaraokeMugen')) {
			conf.System.Path[type].push(conf.System.Path[type][0] + '/KaraokeMugen');
			editSetting({ System:
				{ Path:
					conf.System.Path[type]
				}
			})
		}
		const localFiles = await listLocalFiles(localDir);
		let removedFiles: File[] = [];
		let addedFiles: File[] = [];
		let updatedFiles: File[] = [];
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
			await asyncRemove(resolve(localDir, file.basename));
		}
		const filesToDownload = addedFiles.concat(updatedFiles);
		if (removedFiles.length > 0) await removeFiles(removedFiles.map(f => f.basename), localDir);
		if (filesToDownload.length > 0) {
			filesToDownload.sort((a,b) => {
				return (a.basename > b.basename) ? 1 : ((b.basename > a.basename) ? -1 : 0);
			});
			let bytesToDownload = 0;
			for (const file of filesToDownload) {
				bytesToDownload = bytesToDownload + file.size;
			}
			logger.info(`[${type}] Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`);
			await downloadMedias(filesToDownload, localDir, type, task);
			logger.info(`[${type}] Update done`);
		}
	} catch(err) {
		console.log(err);
	}
}

async function downloadMedias(files: File[], dir: string, type: MediaType, task: Task) {
	let list = [];
	for (const file of files) {
		list.push({
			filename: resolve(dir, file.basename),
			url: `${KMSite.url}/${type}/${encodeURIComponent(file.basename)}`,
			size: file.size
		});
	}
	const mediaDownloads = new Downloader({
		bar: false,
		task: task,
		auth: {
			user: KMSite.username,
			pass: KMSite.password
		}
	});
	const fileErrors = await mediaDownloads.download(list);
	if (fileErrors.length > 0) throw `Error downloading these medias : ${fileErrors.toString()}`;
}


export async function buildMediasList(type: MediaType) {
	medias[type] = [];
	for (const resolvedPath of resolveMediaPath(type)) {
		const newMedias = await extractMediaFiles(resolvedPath);
		for (const media of newMedias) {
			medias[type].push({
				file: media.filename,
				gain: media.gain,
				series: media.filename.split(' - ')[0]
			});
		}
	}
	currentMedias[type] = cloneDeep(medias[type]);
	logger.debug(`[${type}] Computed : ${JSON.stringify(medias[type])}`);
}

export function getSingleMedia(type: MediaType): Media {
	// If no medias exist, return null.
	if (!medias[type] || (medias[type] && medias[type].length === 0)) {
		return null;
	} else {
		// If our current files list is empty after the previous removal
		// Fill it again with the original list.
		currentMedias[type] = cloneDeep(medias[type]);
	}
	// If a default file is provided, search for it. If undefined or not found, pick one from a random series
	const series = sample(currentMedias[type].map((m: Media) => m.series));
	let media = null;
	//Jingles do not have a specific file to use in options
	if (type === 'Jingles' || type === 'Sponsors') {
		media = sample(currentMedias[type].filter((m: Media) => m.series === series));
	} else {
		media = currentMedias[type].find((m: Media) => m.file === getConfig().Playlist.Medias[type].File)
		||
		sample(currentMedias[type].filter((m: Media) => m.series === series));
	}
	//Let's remove the serie of the jingle we just selected so it won't be picked again next time.
	currentMedias[type] = currentMedias[type].filter((m: Media) => m.series !== media.series);
	logger.info(`[Player] ${type} time !`);
	return media;
}

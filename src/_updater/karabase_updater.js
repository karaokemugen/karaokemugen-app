import {basename, resolve} from 'path';
import {getConfig} from '../_utils/config';
import {getState} from '../_utils/state';
import {isGitRepo, asyncUnlink, asyncReadDir, asyncStat, compareDirs, asyncMkdirp, asyncExists, asyncRemove} from '../_utils/files';
import decompress from 'decompress';
import logger from 'winston';
import {copy} from 'fs-extra';
import prettyBytes from 'pretty-bytes';
import {createClient as webdav} from 'webdav';
import Downloader from '../_utils/downloader';
import {emitWS} from '../_webapp/frontend';

const baseURL = 'https://lab.shelter.moe/karaokemugen/karaokebase/repository/master/archive.zip';
const shelter = {
	url: 'https://mugen.karaokes.moe/downloads/medias',
	user: 'kmvideos',
	password: 'musubi'
};
let updateRunning = false;

async function downloadBase() {
	const conf = getConfig();
	const dest = resolve(getState().appPath, conf.System.Path.Temp, 'archive.zip');
	if (await asyncExists(dest)) await asyncRemove(dest);
	logger.info('[Updater] Downloading current base (.kara and .ass files)...');
	const list = [];

	list.push({
		filename: dest,
		url: baseURL
	});
	const baseDownload = new Downloader(list, {bar: true});
	return new Promise((resolve, reject) => {
		baseDownload.download(fileErrors => {
			if (fileErrors.length > 0) {
				reject(`Error downloading this file : ${fileErrors.toString()}`);
			} else {
				resolve();
			}
		});
	});
}

async function decompressBase() {
	const conf = getConfig();
	const workPath = resolve(getState().appPath, conf.System.Path.Temp, 'newbase');
	const archivePath = resolve(getState().appPath, conf.System.Path.Temp, 'archive.zip');
	emitWS('downloadProgress', {
		text: 'Decompressing .kara, .ass and .series files',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 1,
		total: 5
	});

	if (await asyncExists(workPath)) await asyncRemove(workPath);
	await asyncMkdirp(workPath);
	logger.info('[Updater] Decompressing base');
	await decompress(archivePath,workPath);
	logger.info('[Updater] Base decompressed');
	emitWS('downloadProgress', {
		text: 'Decompressing .kara, .ass and .series files',
		value: 100,
		total: 100
	});
	const workPathList = await asyncReadDir(workPath);
	return workPathList[0];
}

async function listRemoteMedias() {
	logger.info('[Updater] Fetching current media list');
	emitWS('downloadProgress', {
		text: 'Listing media files to download',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 3,
		total: 5
	});
	let webdavClient = webdav(
    	shelter.url,
    	{
			username: shelter.user,
			password: shelter.password
		}
	);
	const contents = await webdavClient.getDirectoryContents('/');
	webdavClient = null;
	return contents;
}

async function compareBases() {
	const conf = getConfig();
	const state = getState();
	const seriesMinePath = resolve(state.appPath, conf.System.Path.Series[0]);
	const lyricsMinePath = resolve(state.appPath, conf.System.Path.Lyrics[0]);
	const karasMinePath = resolve(state.appPath, conf.System.Path.Karas[0]);
	const archive = await decompressBase();
	const archiveWOExt = basename(archive, '.zip');
	const karasBasePath = resolve(state.appPath, conf.System.Path.Temp, 'newbase', archiveWOExt,'karas');
	const lyricsBasePath = resolve(state.appPath, conf.System.Path.Temp, 'newbase', archiveWOExt, 'lyrics');
	const seriesBasePath = resolve(state.appPath, conf.System.Path.Temp, 'newbase', archiveWOExt, 'series');
	logger.info('[Updater] Comparing your base with the current one');
	emitWS('downloadProgress', {
		text: 'Comparing your base with Karaoke Mugen\'s latest files',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 2,
		total: 5
	});
	const [karasToUpdate, lyricsToUpdate, seriesToUpdate] = await Promise.all([
		compareDirs(karasMinePath, karasBasePath),
		compareDirs(lyricsMinePath, lyricsBasePath),
		compareDirs(seriesMinePath, seriesBasePath)
	]);
	if (lyricsToUpdate.newFiles.length === 0 &&
		lyricsToUpdate.updatedFiles.length === 0 &&
		lyricsToUpdate.removedFiles.length === 0 &&
		karasToUpdate.newFiles.length === 0 &&
		karasToUpdate.removedFiles.length === 0 &&
		karasToUpdate.updatedFiles.length === 0 &&
		seriesToUpdate.newFiles.length === 0 &&
		seriesToUpdate.removedFiles.length === 0 &&
		seriesToUpdate.updatedFiles.length === 0) {
		logger.info('[Updater] No update for your base');
		emitWS('downloadProgress', {
			text: 'Comparing your base with Karaoke Mugen\'s latest files',
			value: 100,
			total: 100
		});
		return false;
	} else {
		logger.info('[Updater] Updating base files');
		await Promise.all([
			updateFiles(lyricsToUpdate.newFiles, lyricsBasePath, lyricsMinePath,true),
			updateFiles(karasToUpdate.newFiles, karasBasePath, karasMinePath,true),
			updateFiles(lyricsToUpdate.updatedFiles, lyricsBasePath, lyricsMinePath),
			updateFiles(seriesToUpdate.newFiles, seriesBasePath, seriesMinePath,true),
			updateFiles(seriesToUpdate.updatedFiles, seriesBasePath, seriesMinePath),
			updateFiles(karasToUpdate.updatedFiles, karasBasePath, karasMinePath),
			removeFiles(karasToUpdate.removedFiles, karasMinePath),
			removeFiles(lyricsToUpdate.removedFiles, lyricsMinePath),
			removeFiles(seriesToUpdate.removedFiles, seriesMinePath)
		]);
		logger.info('[Updater] Done updating base files');
		emitWS('downloadProgress', {
			text: 'Comparing your base with Karaoke Mugen\'s latest files',
			value: 100,
			total: 100
		});
		asyncRemove(resolve(state.appPath, conf.System.Path.Temp, 'newbase'));
		return true;
	}
}

async function compareMedias(localFiles, remoteFiles) {
	const conf = getConfig();
	let removedFiles = [];
	let addedFiles = [];
	let updatedFiles = [];
	const mediasPath = resolve(getState().appPath, conf.System.Path.Medias[0]);
	logger.info('[Updater] Comparing your medias with the current ones');
	emitWS('downloadProgress', {
		text: 'Comparing your media files with Karaoke Mugen\'s latest files',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 4,
		total: 5
	});
	for (const remoteFile of remoteFiles) {
		const filePresent = localFiles.some(localFile => {
			if (localFile.name === remoteFile.basename) {
				if (localFile.size !== remoteFile.size) updatedFiles.push({
					name: remoteFile.basename,
					size: remoteFile.size
				});
				return true;
			}
			return false;
		});
		if (!filePresent) addedFiles.push({
			name: remoteFile.basename,
			size: remoteFile.size
		});
	}
	for (const localFile of localFiles) {
		const filePresent = remoteFiles.some(remoteFile => {
			return localFile.name === remoteFile.basename;
		});
		if (!filePresent) removedFiles.push(localFile.name);
	}
	// Remove files to update to start over their download
	for (const file of updatedFiles) {
		await asyncUnlink(resolve(mediasPath, file.name));
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
	emitWS('downloadProgress', {
		text: 'Comparing your base with Karaoke Mugen\'s latest files',
		value: 100,
		total: 100
	});
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`[Updater] Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`);
		await downloadMedias(filesToDownload, mediasPath, bytesToDownload);
		logger.info('[Updater] Done updating medias');
		return true;
	} else {
		logger.info('[Updater] No new medias to download');
		return false;
	}
}

function downloadMedias(files, mediasPath) {
	let list = [];
	for (const file of files) {
		list.push({
			filename: resolve(getState().appPath, mediasPath, file.name),
			url: `${shelter.url}/${encodeURIComponent(file.name)}`,
			size: file.size
		});
	}
	const mediaDownloads = new Downloader(list, {
		auth: {
			user: 'kmvideos',
			pass: 'musubi'
		},
		bar: true
	});
	return new Promise((resolve, reject) => {
		mediaDownloads.download(fileErrors => {
			if (fileErrors.length > 0) {
				reject(`Error downloading these medias : ${fileErrors.toString()}`);
			} else {
				resolve();
			}
		});
	});
}

async function listLocalMedias() {
	const conf = getConfig();
	const mediaFiles = await asyncReadDir(resolve(getState().appPath, conf.System.Path.Medias[0]));
	let localMedias = [];
	for (const file of mediaFiles) {
		const mediaStats = await asyncStat(resolve(getState().appPath, conf.System.Path.Medias[0], file));
		localMedias.push({
			name: file,
			size: mediaStats.size
		});
	}
	logger.debug('[Updater] Listed local media files');
	return localMedias;
}

async function removeFiles(files, dir) {
	for (const file of files) {
		await asyncUnlink(resolve(dir, file));
		logger.info(`[Updater] Removed : ${file}`);
	}
}

async function updateFiles(files, dirSource, dirDest, isNew) {
	if (files.length === 0) return true;
	for (const file of files) {
		let action = 'Updated';
		if (isNew) action = 'Added';
		await copy(resolve(dirSource, file), resolve(dirDest, file), {overwrite: true});
		logger.info(`[Updater] ${action} : ${file}`);
	}
}

async function checkDirs() {
	const conf = getConfig();
	if (await isGitRepo(resolve(getState().appPath, conf.System.Path.Karas[0], '../'))) {
		logger.warn('[Updater] Your base folder is a git repository. We cannot update it, please run "git pull" to get updates or use your git client to do it. Media files are going to be updated though.');
		return false;
	}
	return true;
}

export async function runBaseUpdate() {
	if (updateRunning) throw 'An update is already running, please wait for it to finish.';
	updateRunning = true;
	try {
		let updateBase;
		if (await checkDirs()) {
			await downloadBase();
			updateBase = await compareBases();
		}
		const [remoteMedias, localMedias] = await Promise.all([
			listRemoteMedias(),
			listLocalMedias()
		]);
		const updateVideos = await compareMedias(localMedias, remoteMedias);

		updateRunning = false;
		emitWS('downloadProgress', {
			text: 'Done',
			value: 100,
			total: 100
		});
		emitWS('downloadBatchProgress', {
			text: 'Update done!',
			value: 100,
			total: 100
		});
		return !!(updateBase || updateVideos);
	} catch (err) {
		emitWS('downloadProgress', {
			text: 'Done',
			value: 100,
			total: 100
		});
		emitWS('downloadBatchProgress', {
			text: 'Update failed!',
			value: 100,
			total: 100
		});
		updateRunning = false;
		throw err;
	}
}
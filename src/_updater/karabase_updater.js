import download from 'download';
import {basename, resolve} from 'path';
import {getConfig} from '../_common/utils/config';
import {isGitRepo, asyncUnlink, asyncReadDir, asyncStat, compareDirs, compareFiles, asyncMkdirp, asyncExists, asyncRemove} from '../_common/utils/files';
import decompress from 'decompress';
import FTP from 'basic-ftp';
import logger from 'winston';
import {copy} from 'fs-extra';
import {createWriteStream} from 'fs';
import prettyBytes from 'pretty-bytes';
import _cliProgress from 'cli-progress';
import promiseRetry from 'promise-retry';
const baseURL = 'https://lab.shelter.moe/karaokemugen/karaokebase/repository/master/archive.zip';
const shelter = {
	host: 'mugen.karaokes.moe',
	user: 'kmvideos',
	password: 'musubi'
};
let updateRunning = false;

async function downloadBase() {
	const conf = getConfig();
	const dest = resolve(conf.appPath, conf.PathTemp, 'archive');
	if (await asyncExists(dest)) await asyncRemove(dest);
	logger.info('[Updater] Downloading current base (.kara and .ass files)...');
	await download(baseURL, dest);
	logger.info('[Updater] Current base downloaded');
}

async function decompressBase() {
	const conf = getConfig();
	const workPath = resolve(conf.appPath, conf.PathTemp, 'newbase');
	const archivePath = resolve(conf.appPath, conf.PathTemp, 'archive');
	const archivePathList = await asyncReadDir(archivePath);
	const archive = archivePathList[0];
	if (await asyncExists(workPath)) await asyncRemove(workPath);
	await asyncMkdirp(workPath);
	logger.debug('[Updater] Decompressing base');
	await decompress(resolve(archivePath, archive),workPath);
	logger.debug('[Updater] Base decompressed');
	return archive;
}

async function listRemoteMedias() {
	const ftp = new FTP.Client();
	logger.info('[Updater] Fetching current media list');
	await ftpConnect(ftp);
	const list = await ftp.list();
	await ftpClose(ftp);
	// Filter . and ..
	return list.filter(file => file.name.length > 2);
}

async function compareBases() {
	const conf = getConfig();
	const pathSubs = conf.PathSubs.split('|');
	const pathKaras = conf.PathKaras.split('|');
	const altnamesMinePath = resolve(conf.appPath, conf.PathAltname);
	const lyricsMinePath = resolve(conf.appPath, pathSubs[0]);
	const karasMinePath = resolve(conf.appPath, pathKaras[0]);
	const archive = await decompressBase();
	const archiveWOExt = basename(archive, '.zip');
	const karasBasePath = resolve(conf.appPath, conf.PathTemp, 'newbase', archiveWOExt,'karas');
	const lyricsBasePath = resolve(conf.appPath, conf.PathTemp, 'newbase', archiveWOExt, 'lyrics');
	const altnamesBasePath = resolve(conf.appPath, conf.PathTemp, 'newbase', archiveWOExt, 'series.json');
	if (!await compareFiles(altnamesBasePath,altnamesMinePath)) {
		copy(
			altnamesBasePath,
			altnamesMinePath,
			{overwrite: true}
		);
		logger.info('[Updater] Updated series file');
	}
	logger.debug('[Updater] Comparing your base with the current one');
	const [karasToUpdate, lyricsToUpdate] = await Promise.all([
		compareDirs(karasMinePath, karasBasePath),
		compareDirs(lyricsMinePath, lyricsBasePath)
	]);
	if (lyricsToUpdate.newFiles.length === 0 &&
		lyricsToUpdate.updatedFiles.length === 0 &&
		lyricsToUpdate.removedFiles.length === 0 &&
		karasToUpdate.newFiles.length === 0 &&
		karasToUpdate.removedFiles.length === 0 &&
		karasToUpdate.updatedFiles.length === 0) {
		logger.info('[Updater] No update for your base');
		return false;
	} else {
		logger.debug('[Updater] Updating base files');
		await Promise.all([
			updateFiles(lyricsToUpdate.newFiles, lyricsBasePath, lyricsMinePath,true),
			updateFiles(karasToUpdate.newFiles, karasBasePath, karasMinePath,true),
			updateFiles(lyricsToUpdate.updatedFiles, lyricsBasePath, lyricsMinePath),
			updateFiles(karasToUpdate.updatedFiles, karasBasePath, karasMinePath),
			removeFiles(karasToUpdate.removedFiles, karasMinePath),
			removeFiles(lyricsToUpdate.removedFiles, lyricsMinePath)
		]);
		logger.info('[Updater] Done updating base files');
		asyncRemove(resolve(conf.appPath, conf.PathTemp, 'newbase'));
		return true;
	}
}

async function compareMedias(localFiles, remoteFiles) {
	const conf = getConfig();
	const pathMedias = conf.PathMedias.split('|');
	let removedFiles = [];
	let addedFiles = [];
	let updatedFiles = [];
	const mediasPath = resolve(conf.appPath, pathMedias[0]);
	logger.info('[Updater] Comparing your medias with the current ones');
	for (const remoteFile of remoteFiles) {
		const filePresent = localFiles.some(localFile => {
			if (localFile.name === remoteFile.name) {
				if (localFile.size !== remoteFile.size) updatedFiles.push({
					name: remoteFile.name,
					size: remoteFile.size
				});
				return true;
			}
			return false;
		});
		if (!filePresent) addedFiles.push({
			name: remoteFile.name,
			size: remoteFile.size
		});
	}
	for (const localFile of localFiles) {
		const filePresent = remoteFiles.some(remoteFile => {
			return localFile.name === remoteFile.name;

		});
		if (!filePresent) removedFiles.push(localFile.name);
	}
	// Remove files to update to start over their download
	for (const file of updatedFiles) {
		await asyncUnlink(resolve(mediasPath, file.name));
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	const ftp = new FTP.Client();
	await ftpConnect(ftp);
	if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`[Updater] Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`);
		await downloadMedias(ftp, filesToDownload, mediasPath, bytesToDownload);
		logger.info('[Updater] Done updating medias');
		return true;
	} else {
		logger.info('[Updater] No new medias to download');
		return false;
	}
}

async function ftpClose(ftp) {
	return await ftp.close();
}

async function ftpConnect(ftp) {
	await ftp.connect(shelter.host, 21);
	await ftp.login(shelter.user, shelter.password);
	await ftp.useDefaultSettings();
}

async function downloadMedias(ftp, files, mediasPath) {
	let ftpErrors = [];
	const conf = getConfig();
	const barFormat = 'Downloading {bar} {percentage}% {value}/{total} Mb - ETA {eta_formatted}';
	const bar = new _cliProgress.Bar({
		format: barFormat,
		stopOnComplete: true
	}, _cliProgress.Presets.shades_classic);
	let i = 0;
	for (const file of files) {
		let start = 0;
		i++;
		logger.info(`[Updater] (${i}/${files.length}) Downloading ${file.name} (${prettyBytes(file.size)})`);
		bar.start(Math.floor(file.size / 1000) / 1000, 0);
		const outputFile = resolve(conf.appPath, mediasPath, file.name);
		try {
			await doFTPdownload(bar, ftp, createWriteStream(outputFile), file.name, start);
		} catch(err) {
			console.log('Full FTP error trace : ')
			console.log(err);
			logger.error(`[Updater] Error downloading ${file.name} : ${err}`);
			ftpErrors.push(file.name);
		}
		ftp.trackProgress();
		bar.stop();
	}
	if (ftpErrors.length > 0) throw `Error during medias download : ${ftpErrors.toString()}`;
}

async function doFTPDownload(bar, ftp, output, input) {
	let start = 0;
	await promiseRetry((retry) => {
		return FTPdownload(bar, ftp, output, input, start).catch((err) => {
			start = err.pos;
			retry();
		});
	}, {
		retries: 10,
		minTimeout: 1000,
		maxTimeout: 2000
	}).then(() => {
		return true;
	}).catch((err) => {
		throw err.error;
	});
}

async function FTPdownload(bar, ftp, output, input, start) {
	let pos = start;
	ftp.trackProgress(info => {
		pos = info.bytes - 1000000;
		if (pos < 0) pos = 0;
		bar.update(Math.floor(info.bytes / 1000) / 1000);
	});
	ftp.download(output, input, start).then(() => {
		return true;
	}).catch((err) => {
		await ftpClose(ftp);
		await ftpConnect(ftp);
		throw { error: err, pos: pos || 0};
	});
}

async function listLocalMedias() {
	const conf = getConfig();
	const mediaPaths = conf.PathMedias.split('|');
	const mediaPath = mediaPaths[0];
	const mediaFiles = await asyncReadDir(resolve(conf.appPath, mediaPath));
	let localMedias = [];
	for (const file of mediaFiles) {
		const mediaStats = await asyncStat(resolve(conf.appPath, mediaPath, file));
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
		logger.info('[Updater] Removed : '+file);
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
	const karaPaths = conf.PathKaras.split('|');
	const karaPath = karaPaths[0];
	if (await isGitRepo(resolve(conf.appPath, karaPath, '../'))) {
		logger.error('Your base folder is a git repository. We cannot update it, please run "git pull" to get updates or use your git client to do it.');
		return false;
	}
	return true;
}

export async function runBaseUpdate() {
	if (updateRunning) throw 'An update is already running, please wait for it to finish.';
	updateRunning = true;
	try {
		const [remoteMedias, localMedias] = await Promise.all([
			listRemoteMedias(),
			listLocalMedias()
		]);
		const updateVideos = await compareMedias(localMedias, remoteMedias);
		let updateBase;
		if (!await checkDirs()) {
			await downloadBase();
			updateBase = await compareBases();
		}
		updateRunning = false;
		return !!(updateBase || updateVideos);
	} catch (err) {
		updateRunning = false;
		throw err;
	}
}
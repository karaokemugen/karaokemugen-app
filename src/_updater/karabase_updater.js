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

const baseURL = 'https://lab.shelter.moe/karaokemugen/karaokebase/repository/master/archive.zip';
const shelter = {
	host: 'mugen.karaokes.moe',
	user: 'kmvideos',
	password: 'musubi'
};

async function downloadBase() {
	const conf = getConfig();
	const dest = resolve(conf.appPath, conf.PathTemp, 'archive');
	if (await asyncExists(dest)) await asyncRemove(dest);
	logger.info('[Updater] Downloading current base...');
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
	logger.info('[Updater] Decompressing base');
	await decompress(resolve(archivePath, archive),workPath);
	logger.debug('[Updater] Base decompressed');
	return archive;
}

async function listRemoteVideos() {
	const ftp = new FTP.Client();
	logger.info('[Updater] Fetching current video list');
	await ftpConnect(ftp);
	const list = await ftp.list();	
	logger.info('[Updater] Current videos listed');
	await ftpClose(ftp);
	// Filter . and ..
	return list.filter(file => file.name.length > 2);
}

async function compareBases(archive) {
	const conf = getConfig();
	const archiveWOExt = basename(archive, '.zip');
	const pathSubs = conf.PathSubs.split('|');
	const pathKaras = conf.PathKaras.split('|');
	const karasBasePath = resolve(conf.appPath, conf.PathTemp, 'newbase', archiveWOExt,'karas');
	const lyricsBasePath = resolve(conf.appPath, conf.PathTemp, 'newbase', archiveWOExt, 'lyrics');
	const altnamesBasePath = resolve(conf.appPath, conf.PathTemp, 'newbase', archiveWOExt, 'series_altnames.csv');
	const altnamesMinePath = resolve(conf.appPath, conf.PathAltname);
	const lyricsMinePath = resolve(conf.appPath, pathSubs[0]);
	const karasMinePath = resolve(conf.appPath, pathKaras[0]);
	if (!await compareFiles(altnamesBasePath,altnamesMinePath)) {
		copy(
			altnamesBasePath,
			altnamesMinePath,
			{overwrite: true}
		);
		logger.info('[Updater] Updated alternate series name data');
	}
	logger.info('[Updater] Comparing your base with the current one');
	const [karasToUpdate, lyricsToUpdate] = await Promise.all([
		compareDirs(karasMinePath, karasBasePath),
		compareDirs(lyricsMinePath, lyricsBasePath)
	]);
	logger.info('[Updater] Updating base files');
	await Promise.all([
		updateFiles(lyricsToUpdate.newFiles, lyricsBasePath, lyricsMinePath),
		updateFiles(karasToUpdate.newFiles, karasBasePath, karasMinePath),
		updateFiles(lyricsToUpdate.updatedFiles, lyricsBasePath, lyricsMinePath),
		updateFiles(karasToUpdate.updatedFiles, karasBasePath, karasMinePath),
		removeFiles(karasToUpdate.removedFiles, karasMinePath),
		removeFiles(lyricsToUpdate.removedFiles, lyricsMinePath)
	]);	
	logger.info('[Updater] Done updating base files');
}

async function compareVideos(localFiles, remoteFiles) {
	const conf = getConfig();
	const pathVideos = conf.PathVideos.split('|');
	let removedFiles = [];
	let addedFiles = [];
	let updatedFiles = [];
	const VideosPath = resolve(conf.appPath, pathVideos[0]);
	logger.info('[Updater] Comparing your videos with the current ones');
	for (const remoteFile of remoteFiles) {
		const filePresent = localFiles.some(localFile => {
			if (localFile.name == remoteFile.name) {
				if (localFile.size != remoteFile.size) updatedFiles.push({
					name: localFile.name,
					size: localFile.size
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
			if (localFile.name == remoteFile.name) return true;
			return false;
		});
		if (!filePresent) removedFiles.push(localFile.name);
	}
	logger.info('[Updater] Done comparing videos');
	const filesToDownload = addedFiles.concat(updatedFiles);
	const ftp = new FTP.Client();
	await ftpConnect(ftp);
	if (removedFiles.length > 0) await removeFiles(removedFiles, VideosPath);	
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
		});
		let bytesToDownload;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`[Updater] Downloading ${filesToDownload.length} new/updated videos (size : ${prettyBytes(bytesToDownload)})`);		
		await downloadVideos(ftp, filesToDownload, VideosPath, bytesToDownload);
		logger.info('[Updater] Done updating videos');
	} else {
		logger.info('[Updater] No new videos to download');
	}
}

async function ftpClose(ftp) {
	return await ftp.close();
}

async function ftpConnect(ftp) {		
	await ftp.connect(shelter.host, 21);
	await ftp.login(shelter.user, shelter.password);
	await ftp.useDefaultSettings;	
}

async function downloadVideos(ftp, files, VideosPath, totalBytes) {
	const conf = getConfig();
	const bar1 = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);
	bar1.start(totalBytes, 0);
	for (const file of files) {
		logger.info('[Updater] Downloading '+file);
		const outputFile = resolve(conf.appPath, VideosPath, file);
		await ftp.download(createWriteStream(outputFile), file);
		bar1.increment(file.size);
	}
	bar1.stop();
}


async function listLocalVideos() {
	const conf = getConfig();
	const videoPaths = conf.PathVideos.split('|');
	const videoPath = videoPaths[0];
	const videoFiles = await asyncReadDir(resolve(conf.appPath, videoPath));	
	let localVideos = [];
	for (const file of videoFiles) {
		const videoStats = await asyncStat(resolve(conf.appPath, videoPath, file));	
		localVideos.push({
			name: file,
			size: videoStats.size
		});
	}
	logger.debug('[Updater] Listed local video files');
	return localVideos;
}

async function removeFiles(files, dir) {
	if (files.length == 0) return true;
	for (const file of files) {		
		await asyncUnlink(resolve(dir, file));
		logger.info('[Updater] Removed : '+file);
	}
}

async function updateFiles(files, dirSource, dirDest) {
	if (files.length == 0) return true;
	for (const file of files) {		
		await copy(resolve(dirSource, file), resolve(dirDest, file), {overwrite: true});
		logger.info('[Updater] Updated : '+file);
	}
}

async function checkDirs() {
	const conf = getConfig();
	const karaPaths = conf.pathKaras.split('|');
	const karaPath = karaPaths[0];	
	if (await isGitRepo(resolve(conf.appPath, karaPath, '../'))) throw 'Your base folder is a git repository. We cannot update it, please run "git pull" to get updates';
}

export async function runBaseUpdate() {
	try {
		await checkDirs();
		const [base, remoteVideos, localVideos] = await Promise.all([
			downloadBase(),
			listRemoteVideos(),
			listLocalVideos()
		]);
		const archiveName = await decompressBase();
		await Promise.all([
			compareBases(archiveName),
			compareVideos(localVideos, remoteVideos)
		]);
	} catch (err) {
		throw err;
	}	
}
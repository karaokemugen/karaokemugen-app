import download from 'download';
import decompress from 'decompress';
import logger from 'winston';
import {copy} from 'fs-extra';
import {getConfig} from '../_common/utils/config';
import {asyncMkdirp, asyncReadFile, asyncExists, asyncRemove} from '../_common/utils/files';
import {resolve} from 'path';
import semver from 'semver';

const latestURL = 'http://mugen.karaokes.moe/downloads/latest';
const baseDownloadURL = 'http://mugen.karaokes.moe/downloads/';
const baseArchive = 'KaraokeMugen';

export async function runKMUpdate() {
	// Check if an update is necessary
	if (!checkSystem()) throw 'System not compatible with self-updates, please update manually';
	try {
		const latestVersion = await checkUpdate(); 
		if (!latestVersion) throw 'You are already running the latest version';
		const updateFile = await downloadUpdate(latestVersion);
		await decompressUpdate(updateFile);		
	} catch(err) {
		throw err;
	}
	
	//spawnKMUpdate();
}

async function decompressUpdate(file) {
	const conf = getConfig();
	const downloadPath = resolve(conf.appPath, conf.PathTemp, file);
	const workPath = resolve(conf.appPath, conf.PathTemp, 'update');
	if (await asyncExists(workPath)) await asyncRemove(workPath);
	await asyncMkdirp(workPath);
	await decompress(downloadPath,workPath);	
}

async function downloadUpdate(version) {
	const conf = getConfig();
	let downloadSystem;
	if (conf.os == 'darwin') downloadSystem = 'macOS';
	if (conf.os == 'win32') downloadSystem = 'win64';
	const archiveName = `${baseArchive}-${version}-${downloadSystem}.zip`;
	const downloadURL = `${baseDownloadURL}${archiveName}`;
	const updateFile = resolve(conf.appPath, conf.PathTemp, archiveName);
	if (await asyncExists(updateFile)) await asyncRemove(updateFile);
	await download(downloadURL, resolve(conf.appPath, conf.PathTemp));	
	return updateFile;
}

async function checkSystem() {
	const conf = getConfig();
	if (!process.pkg) throw 'You are not using a bundled executable version. Please update via git instead';
	if (conf.os != 'darwin' && conf.os != 'win32') throw 'Your platform is not compatible with self-updates (no binaries available for your system)';
	if (!semver.valid(conf.versionNo)) throw 'Your software version is not supported by self-updates';
}

async function checkUpdate() {
	const conf = getConfig();
	const currentVersion = conf.versionNo;
	// For those on Next the automatic update will try to download the latest version anyway;
	// Grab latest file
	const latestFile = resolve(conf.appPath, conf.PathTemp, 'latest');
	if (await asyncExists(latestFile)) await asyncRemove(latestFile);
	try {
		await download(latestURL, resolve(conf.appPath, conf.PathTemp));	
		let latestVersion = await asyncReadFile(latestFile);	
		if (semver.gt(semver.coerce(latestVersion), currentVersion)) return latestVersion;
		return false;
	} catch (err) {
		throw `Error checking latest version information : ${err}`;
	}
}
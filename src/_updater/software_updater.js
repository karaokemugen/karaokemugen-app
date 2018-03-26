import download from 'download';
import logger from 'winston';
import {getConfig} from '../_common/utils/config';
import {asyncReadFile, asyncExists, asyncRemove} from '../_common/utils/files';
import {resolve} from 'path';
import semver from 'semver';
import execa from 'execa';

const latestURL = 'http://mugen.karaokes.moe/downloads/latest';

export async function runKMUpdate() {
	// Check if an update is necessary
	try {
		if (!checkSystem()) throw 'System not compatible with self-updates, please update manually';	
		const latestVersion = await checkUpdate(); 
		if (!latestVersion) throw 'You are already running the latest version';
		launchUpdater();
	} catch(err) {
		throw err;
	}	
}

async function launchUpdater() {
	execa('./yagu');
	logger.info('[Updater] Exiting after launching software update');
	process.exit(0);
}

async function checkSystem() {
	const conf = getConfig();
	if (!process.pkg) throw 'You are not using a bundled executable version. Please update via git or archive download';
	//FIXME : Add git pull support if git is detected and the folder is a repository
	if (conf.os != 'darwin' && conf.os != 'win32') throw 'Your platform is not compatible with self-updates (no binaries available for your system)';
	if (!semver.valid(conf.versionNo)) throw `Your software version (${conf.versionNo}) is not supported by self-updates`;
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
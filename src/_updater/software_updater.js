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
		const conf = getConfig();
		if (!checkSystem()) throw 'System not compatible with self-updates, please update manually';	
		let latestVersion = true;
		if (semver.valid(conf.versionNo)) latestVersion = await checkUpdate(); 
		if (!latestVersion) throw 'You are already running the latest version';
		launchUpdater();
	} catch(err) {
		throw err;
	}	
}

async function launchUpdater() {
	const conf = getConfig();
	let binary = 'yagu';
	if (conf.os === 'win32') binary = 'YAGU.exe';
	const release = conf.versionNo.toLowerCase();
	execa(`./updater/${binary}`,`http://mugen.karaokes.moe/downloads/${release}.${conf.os}.json`);
	logger.info('[Updater] Exiting after launching software update');
	process.exit(0);
}

async function checkSystem() {
	const conf = getConfig();
	if (!process.pkg) throw 'You are not using a bundled executable version. Please update via git or archive download';
	//FIXME : Add git pull support if git is detected and the folder is a repository
	if (conf.os !== 'darwin' && conf.os !== 'win32') throw 'Your platform is not compatible with self-updates (no binaries available for your system)';	
}

async function checkUpdate() {
	const conf = getConfig();
	const currentVersion = conf.versionNo;
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
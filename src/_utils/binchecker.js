// This script is here to check for paths and to provide binary paths depending on your operating system

import {resolve} from 'path';
import {asyncRequired} from './files';
import {exit} from '../_services/engine';
import logger from 'winston';

// Check if binaries are available
// Provide their paths for runtime

export async function checkBinaries(config) {

	const binariesPath = configuredBinariesForSystem(config);

	let requiredBinariesChecks = [];
	requiredBinariesChecks.push(asyncRequired(binariesPath.BinffmpegPath));
	if (!config.isTest && !config.isDemo) {
		requiredBinariesChecks.push(asyncRequired(binariesPath.BinmpvPath));
	}

	try {
		await Promise.all(requiredBinariesChecks);
	} catch (err) {
		binMissing(binariesPath, err);
		exit();
	}

	return binariesPath;
}

function configuredBinariesForSystem(config) {
	switch (config.os) {
	case 'win32':
		return {
			BinffmpegPath: resolve(config.appPath, config.BinffmpegWindows),
			BinmpvPath: resolve(config.appPath, config.BinPlayerWindows),
		};
	case 'darwin':
		return {
			BinffmpegPath: resolve(config.appPath, config.BinffmpegOSX),
			BinmpvPath: resolve(config.appPath, config.BinPlayerOSX),
		};
	default:
		return {
			BinffmpegPath: resolve(config.appPath, config.BinffmpegLinux),
			BinmpvPath: resolve(config.appPath, config.BinPlayerLinux),
		};
	}
}

function binMissing(binariesPath, err) {
	logger.error('[BinCheck] One or more binaries could not be found! (' + err + ')');
	logger.error('[BinCheck] Paths searched : ');
	logger.error('[BinCheck] ffmpeg : ' + binariesPath.BinffmpegPath);
	logger.error('[BinCheck] mpv : ' + binariesPath.BinmpvPath);
	logger.error('[BinCheck] Exiting...');
	console.log('\n');
	console.log('One or more binaries needed by Karaoke Mugen could not be found.');
	console.log('Check the paths above and make sure these are available.');
	console.log('Edit your config.ini and set Binffmpeg and BinPlayer variables correctly for your OS.');
	console.log('You can download mpv for your OS from http://mpv.io/');
	console.log('You can download ffmpeg for your OS from http://ffmpeg.org');
}

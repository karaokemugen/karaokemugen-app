// This script is here to check for paths and to provide binary paths depending on your operating system

import {resolve} from 'path';
import {asyncRequired} from '../lib/utils/files';
import {exit} from '../services/engine';
import logger from 'winston';
import { getState } from './state';
import {Config} from '../types/config';
import {BinariesConfig} from '../types/binChecker';

// Check if binaries are available
// Provide their paths for runtime

export async function checkBinaries(config: Config): Promise<BinariesConfig> {

	const binariesPath = configuredBinariesForSystem(config);
	let requiredBinariesChecks = [];
	requiredBinariesChecks.push(asyncRequired(binariesPath.ffmpeg));
	if (config.Database.prod.bundledPostgresBinary) requiredBinariesChecks.push(asyncRequired(resolve(binariesPath.postgres, binariesPath.postgres_ctl)));
	if (!getState().isTest && !getState().isDemo) requiredBinariesChecks.push(asyncRequired(binariesPath.mpv));

	try {
		await Promise.all(requiredBinariesChecks);
	} catch (err) {
		binMissing(binariesPath, err);
		await exit(1);
	}

	return binariesPath;
}

function configuredBinariesForSystem(config: Config): BinariesConfig {
	switch (process.platform) {
	case 'win32':
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Windows),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.Windows),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Windows),
			postgres_ctl: 'pg_ctl.exe',
			postgres_dump: 'pg_dump.exe'
		};
	case 'darwin':
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.OSX),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.OSX),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.OSX),
			postgres_ctl: 'pg_ctl',
			postgres_dump: 'pg_dump'
		};
	default:
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Linux),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.Linux),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Linux),
			postgres_ctl: 'pg_ctl',
			postgres_dump: 'pg_dump'
		};
	}
}

function binMissing(binariesPath: any, err: string) {
	logger.error('[BinCheck] One or more binaries could not be found! (' + err + ')');
	logger.error('[BinCheck] Paths searched : ');
	logger.error('[BinCheck] ffmpeg : ' + binariesPath.ffmpeg);
	logger.error('[BinCheck] mpv : ' + binariesPath.mpv);
	logger.error('[BinCheck] Postgres : ' + binariesPath.postgres);
	logger.error('[BinCheck] Exiting...');
	console.log('\n');
	console.log('One or more binaries needed by Karaoke Mugen could not be found.');
	console.log('Check the paths above and make sure these are available.');
	console.log('Edit your config.yml and set System.Binaries.ffmpeg and System.Binaries.Player variables correctly for your OS.');
	console.log('You can download mpv for your OS from http://mpv.io/');
	console.log('You can download postgres for your OS from http://postgresql.org/');
	console.log('You can download ffmpeg for your OS from http://ffmpeg.org');
}

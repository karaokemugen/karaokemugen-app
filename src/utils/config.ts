/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {address} from 'ip';
import logger from '../lib/utils/logger';
import {asyncCopy, asyncRequired} from '../lib/utils/files';
import {configureIDs, configureLocale, loadConfigFiles, setConfig, verifyConfig, getConfig, setConfigConstraints} from '../lib/utils/config';
import {configConstraints, defaults} from './default_settings';
import {publishURL} from '../services/online';
import {playerNeedsRestart, prepareClassicPauseScreen} from '../services/player';
import {getState, setState} from './state';
import {setSongPoll} from '../services/poll';
import {initStats, stopStats} from '../services/stats';
import merge from 'lodash.merge';
import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';
import {Config} from '../types/config';
import { listUsers } from '../dao/user';
import { updateSongsLeft } from '../services/user';
import { emitWS } from '../lib/utils/ws';
import { emit } from '../lib/utils/pubsub';
import { BinariesConfig } from '../types/binChecker';
import { exit } from '../services/engine';
import { initTwitch, stopTwitch } from './twitch';

/** Edit a config item, verify the new config is valid, and act according to settings changed */
export async function editSetting(part: object) {
	try {
		const config = getConfig();
		const oldConfig = cloneDeep(config);
		const newConfig = merge(config, part);
		verifyConfig(newConfig);
		await mergeConfig(newConfig, oldConfig);
		emitWS('settingsUpdated', config);
		return config;
	} catch(err) {
		throw err;
	}
}

/** Merge and act according to config changes */
export async function mergeConfig(newConfig: Config, oldConfig: Config) {
	// Determine if mpv needs to be restarted
	if (!isEqual(oldConfig.Player, newConfig.Player)) {
		//If these two settings haven't been changed, it means another one has, so we're restarting mpv
		if (oldConfig.Player.FullScreen === newConfig.Player.FullScreen && oldConfig.Player.StayOnTop === newConfig.Player.StayOnTop) {
			playerNeedsRestart();
			logger.debug('[Config] Setting mpv to restart after next song');
		}
	}
	if (newConfig.Online.URL && getState().ready) publishURL();
	// Updating quotas
	if (newConfig.Karaoke.Quota.Type !== oldConfig.Karaoke.Quota.Type || newConfig.Karaoke.Quota.Songs !== oldConfig.Karaoke.Quota.Songs || newConfig.Karaoke.Quota.Time !== oldConfig.Karaoke.Quota.Time) {
		const users = await listUsers();
		for (const user of users) {
			updateSongsLeft(user.login, getState().modePlaylistID);
		};
	}
	if (!newConfig.Karaoke.ClassicMode) setState({currentRequester: null});
	if (newConfig.Karaoke.ClassicMode && getState().status === 'stop') prepareClassicPauseScreen();
	const config = setConfig(newConfig);
	setSongPoll(config.Karaoke.Poll.Enabled);
	// Toggling twitch
	try {
		config.Karaoke.StreamerMode.Twitch.Enabled
			? initTwitch()
			: stopTwitch();
	} catch(err) {
		logger.warn(`[Config] Could not start/stop Twitch chat bot : ${err}`);
	}
	// Toggling stats
	config.Online.Stats
		? initStats(newConfig.Online.Stats === oldConfig.Online.Stats)
		: stopStats();
	// Toggling and updating settings
	setState({private: config.Karaoke.Private});
	configureHost();
}

/** Initializing configuration */
export async function initConfig(argv: any) {
	setConfigConstraints(configConstraints);
	await configureLocale();
	await loadConfigFiles(getState().appPath, argv.config, defaults);
	const binaries = await checkBinaries(getConfig());
	setState({binPath: binaries});
	emit('configReady');
	configureHost();
	configureIDs();
	return getConfig();
}

/** Detect and set hostname and local IP */
export function configureHost() {
	const config = getConfig();
	const URLPort = +config.Online.Port === 80
		? ''
		: `:${config.Frontend.Port}`;
	setState({osHost: address()});
	if (config.Online.URL) {
		setState({osURL: `http://${config.Online.Host}`});
	} else {
		if (!config.Karaoke.Display.ConnectionInfo.Host) {
			setState({osURL: `http://${address()}${URLPort}`});
		} else {
			setState({osURL: `http://${config.Karaoke.Display.ConnectionInfo.Host}${URLPort}`});
		}
	}
}

/** Create a backup of our config file. Just in case. */
export async function backupConfig() {
	logger.debug('[Config] Making a backup of config.yml');
	return await asyncCopy(
		resolve(getState().appPath, 'config.yml'),
		resolve(getState().appPath, 'config.backup.yml'),
		{ overwrite: true }
	);
}

/** Return public configuration (without sensitive data) */
export function getPublicConfig() {
	const publicSettings = cloneDeep(getConfig());
	delete publicSettings.App.JwtSecret;
	delete publicSettings.Database;
	delete publicSettings.System;
	publicSettings.Karaoke.StreamerMode.Twitch.OAuth = '*********'
	return publicSettings;
}

/** Check if binaries are available. Provide their paths for runtime */
async function checkBinaries(config: Config): Promise<BinariesConfig> {
	const binariesPath = configuredBinariesForSystem(config);
	let requiredBinariesChecks = [];
	requiredBinariesChecks.push(asyncRequired(binariesPath.ffmpeg));
	if (config.Database.prod.bundledPostgresBinary) {
		requiredBinariesChecks.push(asyncRequired(resolve(binariesPath.postgres, binariesPath.postgres_ctl)));
		if (process.platform === 'win32') requiredBinariesChecks.push(asyncRequired('C:/Windows/System32/msvcr120.dll'));
	}
	if (!getState().isTest && !getState().isDemo) requiredBinariesChecks.push(asyncRequired(binariesPath.mpv));

	try {
		await Promise.all(requiredBinariesChecks);
	} catch (err) {
		binMissing(binariesPath, err);
		await exit(1);
	}

	return binariesPath;
}

/** Return all configured paths for binaries */
function configuredBinariesForSystem(config: Config): BinariesConfig {
	switch (process.platform) {
	case 'win32':
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Windows),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.Windows),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Windows),
			postgres_ctl: 'pg_ctl.exe',
			postgres_dump: 'pg_dump.exe',
			postgres_client: 'psql.exe'
		};
	case 'darwin':
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.OSX),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.OSX),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.OSX),
			postgres_ctl: 'pg_ctl',
			postgres_dump: 'pg_dump',
			postgres_client: 'psql'
		};
	default:
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Linux),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.Linux),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Linux),
			postgres_ctl: 'pg_ctl',
			postgres_dump: 'pg_dump',
			postgres_client: 'psql'
		};
	}
}

/** Error out on missing binaries */
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
	console.log('Edit your config.yml and set System.Binaries.ffmpeg, System.Binaries.Player and System.Binaries.Postgres variables correctly for your OS.');
	console.log('You can download mpv for your OS from http://mpv.io/');
	console.log('You can download postgreSQL for your OS from http://postgresql.org/');
	console.log('You can download ffmpeg for your OS from http://ffmpeg.org');
	if (process.platform === 'win32') console.log('If the missing file is msvcr120.dll, download Microsoft Visual C++ 2013 Redistribuable Package here : https://www.microsoft.com/en-US/download/details.aspx?id=40784')
}

/** Centralized configuration management for Karaoke Mugen. */

// Node modules
import { dialog } from 'electron';
import { copy } from 'fs-extra';
import i18next from 'i18next';
import {address} from 'ip';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import merge from 'lodash.merge';
import {resolve} from 'path';

import { listUsers } from '../dao/user';
import { setProgressBar } from '../electron/electron';
import { errorStep } from '../electron/electronLogger';
import { registerShortcuts, unregisterShortcuts } from '../electron/electronShortcuts';
import {RecursivePartial} from '../lib/types';
import {configureIDs, getConfig, loadConfigFiles, setConfig, setConfigConstraints,verifyConfig} from '../lib/utils/config';
import {asyncRequired,relativePath} from '../lib/utils/files';
// KM Imports
import logger from '../lib/utils/logger';
import { removeNulls } from '../lib/utils/objectHelpers';
import { createImagePreviews } from '../lib/utils/previews';
import { emit } from '../lib/utils/pubsub';
import { emitWS } from '../lib/utils/ws';
import { getAllKaras } from '../services/kara';
import {
	displayInfo,
	initAddASongMessage,
	playerNeedsRestart,
	prepareClassicPauseScreen,
	stopAddASongMessage
} from '../services/player';
import {setSongPoll} from '../services/poll';
import {destroyRemote, initRemote} from '../services/remote';
import {initStats, stopStats} from '../services/stats';
import { updateSongsLeft } from '../services/user';
import { BinariesConfig } from '../types/binChecker';
import {Config} from '../types/config';
import sentry from '../utils/sentry';
import {configConstraints, defaults} from './defaultSettings';
import { initDiscordRPC, stopDiscordRPC } from './discordRPC';
import { initKMServerCommunication } from './kmserver';
import {getState, setState} from './state';
import {writeStreamFiles} from './streamerFiles';
import { initTwitch, stopTwitch } from './twitch';

/** Edit a config item, verify the new config is valid, and act according to settings changed */
export async function editSetting(part: RecursivePartial<Config>) {
	try {
		const config = getConfig();
		const oldConfig = removeNulls(cloneDeep(config));
		const newConfig = removeNulls(merge(config, part));
		verifyConfig(newConfig);
		await mergeConfig(newConfig, oldConfig);
		emitWS('settingsUpdated', part);
		return config;
	} catch(err) {
		sentry.error(err, 'Warning');
		throw err;
	}
}

/** Merge and act according to config changes */
export async function mergeConfig(newConfig: Config, oldConfig: Config) {
	// Determine if mpv needs to be restarted
	const state = getState();
	if (!isEqual(oldConfig.Player, newConfig.Player) && !state.isDemo) {
		// If these settings have been changed, a restart of mpv is necessary
		if (
			oldConfig.Player.mpvVideoOutput !== newConfig.Player.mpvVideoOutput ||
			oldConfig.Player.ExtraCommandLine !== newConfig.Player.ExtraCommandLine ||
			oldConfig.Player.Monitor !== newConfig.Player.Monitor
		) playerNeedsRestart();
	}
	if (newConfig.Online.Remote !== oldConfig.Online.Remote && state.ready && !state.isDemo) {
		if (newConfig.Online.Remote) {
			await initKMServerCommunication();
			initRemote();
		} else {
			destroyRemote();
		}
	}
	// Updating quotas
	if (newConfig.Karaoke.Quota.Type !== oldConfig.Karaoke.Quota.Type ||
		newConfig.Karaoke.Quota.Songs !== oldConfig.Karaoke.Quota.Songs ||
		newConfig.Karaoke.Quota.Time !== oldConfig.Karaoke.Quota.Time
	) {
		const users = await listUsers();
		for (const user of users) {
			updateSongsLeft(user.login, getState().publicPlaid);
		}
	}
	if (!newConfig.Karaoke.ClassicMode) setState({currentRequester: null});
	if (newConfig.Karaoke.ClassicMode && state.player.playerStatus === 'stop') prepareClassicPauseScreen();
	if (!oldConfig.Frontend.GeneratePreviews && newConfig.Frontend.GeneratePreviews) createImagePreviews(await getAllKaras(), 'single');

	// Browse through paths and define if it's relative or absolute
	if (oldConfig.System.Binaries.Player.Windows !== newConfig.System.Binaries.Player.Windows) newConfig.System.Binaries.Player.Windows = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.Player.Windows));
	if (oldConfig.System.Binaries.Player.Linux !== newConfig.System.Binaries.Player.Linux) newConfig.System.Binaries.Player.Linux = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.Player.Linux));
	if (oldConfig.System.Binaries.Player.OSX !== newConfig.System.Binaries.Player.OSX) newConfig.System.Binaries.Player.OSX = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.Player.OSX));
	if (oldConfig.System.Binaries.ffmpeg.Windows !== newConfig.System.Binaries.ffmpeg.Windows) newConfig.System.Binaries.ffmpeg.Windows = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.ffmpeg.Windows));
	if (oldConfig.System.Binaries.ffmpeg.Linux !== newConfig.System.Binaries.ffmpeg.Linux) newConfig.System.Binaries.ffmpeg.Linux = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.ffmpeg.Linux));
	if (oldConfig.System.Binaries.ffmpeg.OSX !== newConfig.System.Binaries.ffmpeg.OSX) newConfig.System.Binaries.ffmpeg.OSX = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.ffmpeg.OSX));
	if (oldConfig.System.Binaries.Postgres.Windows !== newConfig.System.Binaries.Postgres.Windows)  newConfig.System.Binaries.Postgres.Windows = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.Postgres.Windows));
	if (oldConfig.System.Binaries.Postgres.Linux !== newConfig.System.Binaries.Postgres.Linux) newConfig.System.Binaries.Postgres.Linux = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.Postgres.Linux));
	if (oldConfig.System.Binaries.Postgres.OSX !== newConfig.System.Binaries.Postgres.OSX) newConfig.System.Binaries.Postgres.OSX = relativePath(state.appPath, resolve(state.appPath, newConfig.System.Binaries.Postgres.OSX));
	for (const i in Object.keys(newConfig.System.Repositories)) {
		for (const path of Object.keys(newConfig.System.Repositories[i].Path)) {
			if (!isEqual(newConfig.System.Repositories[i].Path[path], oldConfig.System.Repositories[i].Path[path])) {
				if (Array.isArray(newConfig.System.Repositories[i].Path[path])) {
					for (const y in newConfig.System.Repositories[i].Path[path]) {
						newConfig.System.Repositories[i].Path[path][y] = relativePath(state.dataPath, resolve(state.dataPath, newConfig.System.Repositories[i].Path[path][y]));
					}
				} else {
					newConfig.System.Repositories[i].Path[path] = relativePath(state.dataPath, resolve(state.dataPath, newConfig.System.Repositories[i].Path[path]));
				}
			}
		}
	}
	for (const path of Object.keys(newConfig.System.Path)) {
		if (!isEqual(newConfig.System.Path[path], oldConfig.System.Path[path])) {
			if (Array.isArray(newConfig.System.Path[path])) {
				for (const i in newConfig.System.Path[path]) {
					newConfig.System.Path[path][i] = relativePath(state.dataPath, resolve(state.dataPath, newConfig.System.Path[path][i]));
				}
			} else {
				newConfig.System.Path[path] = relativePath(state.dataPath, resolve(state.dataPath, newConfig.System.Path[path]));
			}
		}
	}

	// All set, ready to go!
	const config = setConfig(newConfig);

	// Toggling media shortcuts
	if (!oldConfig.Player.KeyboardMediaShortcuts && config.Player.KeyboardMediaShortcuts) registerShortcuts();
	if (oldConfig.Player.KeyboardMediaShortcuts && !config.Player.KeyboardMediaShortcuts) unregisterShortcuts();
	// Toggling poll
	if (state.ready) setSongPoll(config.Karaoke.Poll.Enabled);
	// Toggling twitch
	config.Karaoke.StreamerMode.Twitch.Enabled && !state.isDemo
		? initTwitch().catch(err => {
			logger.warn('Could not start Twitch chat bot', {service: 'Config', obj: err});
		})
		: stopTwitch().catch(err => {
			logger.warn('Could not stop Twitch chat bot', {service: 'Config', obj: err});
		});
	// Toggling random song after end message
	config.Playlist.RandomSongsAfterEndMessage && !state.isDemo
		? initAddASongMessage()
		: stopAddASongMessage();
	// Toggling Discord RPC
	config.Online.Discord.DisplayActivity && !state.isDemo
		? initDiscordRPC()
		: stopDiscordRPC();
	// Toggling stats
	config.Online.Stats && !state.isDemo
		? initStats(newConfig.Online.Stats === oldConfig.Online.Stats)
		: stopStats();
	// Streamer mode
	if (config.Karaoke.StreamerMode.Enabled) writeStreamFiles();
	// Toggling progressbar off if needs be
	if (config.Player.ProgressBarDock && !state.isDemo) setProgressBar(-1);

	if (!state.isDemo) configureHost();
}

/** Initializing configuration */
export async function initConfig(argv: any) {
	try {
		setConfigConstraints(configConstraints);
		await loadConfigFiles(getState().dataPath, argv.config, defaults, getState().appPath);
		const publicConfig = cloneDeep(getConfig());
		publicConfig.Karaoke.StreamerMode.Twitch.OAuth = 'xxxxx';
		publicConfig.App.JwtSecret = 'xxxxx';
		publicConfig.App.InstanceID = 'xxxxx';
		logger.debug('Loaded configuration', {service: 'Launcher', obj: publicConfig});
		const binaries = await checkBinaries(getConfig());
		setState({binPath: binaries});
		emit('configReady');
		configureHost();
		configureIDs();
		return getConfig();
	} catch(err) {
		logger.error('InitConfig failed', {service: 'Launcher', obj: err});
		throw err;
	}
}

/** Detect and set hostname and local IP */
export function configureHost() {
	const state = getState();
	const config = getConfig();
	const URLPort = +config.Frontend.Port === 80
		? ''
		: `:${config.Frontend.Port}`;
	setState({osHost: {v4: address(undefined, 'ipv4'), v6: address(undefined, 'ipv6')}});
	if (state.remoteAccess && 'host' in state.remoteAccess) {
		setState({osURL: `https://${state.remoteAccess.host}`});
	} else {
		if (!config.Karaoke.Display.ConnectionInfo.Host) {
			setState({osURL: `http://${getState().osHost.v4}${URLPort}`}); // v6 is too long to show anyway
		} else {
			setState({osURL: `http://${config.Karaoke.Display.ConnectionInfo.Host}${URLPort}`});
		}
	}
	if ((state.player.mediaType === 'background' || state.player.mediaType === 'pauseScreen') && !state.songPoll) {
		displayInfo();
	}
	writeStreamFiles('km_url');
}

/** Create a backup of our config file. Just in case. */
export function backupConfig() {
	logger.debug('Making a backup of config.yml', {service: 'Config'});
	return copy(
		resolve(getState().dataPath, 'config.yml'),
		resolve(getState().dataPath, `config.backup.${new Date().getTime().toString()}.yml`),
		{ overwrite: true }
	);
}

/** Return public configuration (without sensitive data) */
export function getPublicConfig(removeSystem = true) {
	const publicSettings = cloneDeep(getConfig());
	delete publicSettings.App.JwtSecret;
	delete publicSettings.System.Database;
	if (removeSystem) delete publicSettings.System;
	else delete publicSettings.System.Binaries;
	delete publicSettings.Karaoke.StreamerMode.Twitch.OAuth;
	delete publicSettings.Frontend.Port;
	delete publicSettings.Frontend.AuthExpireTime;
	return publicSettings;
}

/** Check if binaries are available. Provide their paths for runtime */
async function checkBinaries(config: Config): Promise<BinariesConfig> {
	const binariesPath = configuredBinariesForSystem(config);
	const requiredBinariesChecks = [];
	requiredBinariesChecks.push(asyncRequired(binariesPath.ffmpeg));
	requiredBinariesChecks.push(asyncRequired(binariesPath.patch));
	if (config.System.Database.bundledPostgresBinary) {
		requiredBinariesChecks.push(asyncRequired(resolve(binariesPath.postgres, binariesPath.postgres_ctl)));		
	}
	if (!getState().isTest && !getState().isDemo) requiredBinariesChecks.push(asyncRequired(binariesPath.mpv));

	try {
		await Promise.all(requiredBinariesChecks);
		return binariesPath;
	} catch (err) {
		await binMissing(binariesPath, err);
		errorStep(i18next.t('ERROR_MISSING_BINARIES'));
		throw err;
	}
}

/** Return all configured paths for binaries */
function configuredBinariesForSystem(config: Config): BinariesConfig {
	switch (process.platform) {
		case 'win32':
			return {
				ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Windows),
				mpv: resolve(getState().appPath, config.System.Binaries.Player.Windows),
				postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Windows),
				patch: resolve(getState().appPath, config.System.Binaries.patch.Windows),
				postgres_ctl: 'pg_ctl.exe',
				postgres_dump: 'pg_dump.exe',
				postgres_client: 'psql.exe'
			};
		case 'darwin':
			return {
				ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.OSX),
				mpv: resolve(getState().appPath, config.System.Binaries.Player.OSX),
				postgres: resolve(getState().appPath, config.System.Binaries.Postgres.OSX),
				patch: resolve(getState().appPath, config.System.Binaries.patch.OSX),
				postgres_ctl: 'pg_ctl',
				postgres_dump: 'pg_dump',
				postgres_client: 'psql'
			};
		default:
			return {
				ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Linux),
				mpv: resolve(getState().appPath, config.System.Binaries.Player.Linux),
				postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Linux),
				patch: resolve(getState().appPath, config.System.Binaries.patch.Linux),
				postgres_ctl: 'pg_ctl',
				postgres_dump: 'pg_dump',
				postgres_client: 'psql'
			};
	}
}

/** Error out on missing binaries */
async function binMissing(binariesPath: any, err: string) {
	logger.error('One or more binaries could not be found!', {service: 'BinCheck', obj: err});
	logger.error('Paths searched : ', {service: 'BinCheck'});
	logger.error(`ffmpeg: ${binariesPath.ffmpeg}`, {service: 'BinCheck'});
	logger.error(`mpv: ${binariesPath.mpv}`, {service: 'BinCheck'});
	logger.error(`postgres: ${binariesPath.postgres}`, {service: 'BinCheck'});
	logger.error(`patch: ${binariesPath.patch}`, {service: 'BinCheck'});
	logger.error('Exiting...', {service: 'BinCheck'});
	const error = `${i18next.t('MISSING_BINARIES.MESSAGE')}\n\n${err}`;
	console.log(error);
	if (dialog) {
		await dialog.showMessageBox({
			type: 'none',
			title: i18next.t('MISSING_BINARIES.TITLE'),
			message: error
		});
	}
}

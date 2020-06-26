/** Centralized configuration management for Karaoke Mugen. */

// Node modules
import { dialog } from 'electron';
import i18next from 'i18next';
import {address} from 'ip';
import { createCIDR } from 'ip6addr';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import merge from 'lodash.merge';
import Traceroute from 'nodejs-traceroute';
import {resolve} from 'path';
import { ip as whoisIP } from 'whoiser';

import { listUsers } from '../dao/user';
import { setProgressBar } from '../electron/electron';
import { errorStep } from '../electron/electronLogger';
import {configureIDs, getConfig, loadConfigFiles, setConfig, setConfigConstraints,verifyConfig} from '../lib/utils/config';
import {asyncCopy, asyncRequired,relativePath} from '../lib/utils/files';
// KM Imports
import logger from '../lib/utils/logger';
import { removeNulls } from '../lib/utils/object_helpers';
import { emit } from '../lib/utils/pubsub';
import { emitWS } from '../lib/utils/ws';
import {publishURL} from '../services/online';
import {initAddASongMessage, playerNeedsRestart, prepareClassicPauseScreen,  stopAddASongMessage } from '../services/player';
import {setSongPoll} from '../services/poll';
import {initStats, stopStats} from '../services/stats';
import { updateSongsLeft } from '../services/user';
import { BinariesConfig } from '../types/binChecker';
import {Config} from '../types/config';
import sentry from '../utils/sentry';
import { ASNPrefixes } from './constants';
import {configConstraints, defaults} from './default_settings';
import { initDiscordRPC, stopDiscordRPC } from './discordRPC';
import {getState, setState} from './state';
import { initTwitch, stopTwitch } from './twitch';

/** Edit a config item, verify the new config is valid, and act according to settings changed */
export async function editSetting(part: any) {
	try {
		const config = getConfig();
		const oldConfig = cloneDeep(config);
		const newConfig = merge(config, part);
		removeNulls(newConfig);
		verifyConfig(newConfig);
		await mergeConfig(newConfig, oldConfig);
		emitWS('settingsUpdated', config);
		return config;
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	}
}

/** Merge and act according to config changes */
export async function mergeConfig(newConfig: Config, oldConfig: Config) {
	// Determine if mpv needs to be restarted
	const state = getState();
	if (!isEqual(oldConfig.Player, newConfig.Player) && !state.isDemo) {
		//If these two settings haven't been changed, it means another one has, so we're restarting mpv
		if (oldConfig.Player.FullScreen === newConfig.Player.FullScreen &&
			oldConfig.Player.StayOnTop === newConfig.Player.StayOnTop &&
			oldConfig.Player.Volume === newConfig.Player.Volume &&
			oldConfig.Player.PIP.Size === newConfig.Player.PIP.Size &&
			oldConfig.Player.VisualizationEffects === newConfig.Player.VisualizationEffects &&
			oldConfig.Player.HardwareDecoding === newConfig.Player.HardwareDecoding
		) playerNeedsRestart();
	}
	if (newConfig.Online.URL !== oldConfig.Online.URL && state.ready && !state.isDemo) publishURL();
	// Updating quotas
	if (newConfig.Karaoke.Quota.Type !== oldConfig.Karaoke.Quota.Type || newConfig.Karaoke.Quota.Songs !== oldConfig.Karaoke.Quota.Songs || newConfig.Karaoke.Quota.Time !== oldConfig.Karaoke.Quota.Time) {
		const users = await listUsers();
		for (const user of users) {
			updateSongsLeft(user.login, getState().publicPlaylistID);
		}
	}
	if (!newConfig.Karaoke.ClassicMode) setState({currentRequester: null});
	if (newConfig.Karaoke.ClassicMode && state.player.playerStatus === 'stop') prepareClassicPauseScreen();
	// Browse through paths and define if it's relative or absolute
	if (oldConfig.System.Binaries.Player.Windows !== newConfig.System.Binaries.Player.Windows) newConfig.System.Binaries.Player.Windows = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.Player.Windows));
	if (oldConfig.System.Binaries.Player.Linux !== newConfig.System.Binaries.Player.Linux) newConfig.System.Binaries.Player.Linux = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.Player.Linux));
	if (oldConfig.System.Binaries.Player.OSX !== newConfig.System.Binaries.Player.OSX) newConfig.System.Binaries.Player.OSX = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.Player.OSX));
	if (oldConfig.System.Binaries.ffmpeg.Windows !== newConfig.System.Binaries.ffmpeg.Windows) newConfig.System.Binaries.ffmpeg.Windows = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.ffmpeg.Windows));
	if (oldConfig.System.Binaries.ffmpeg.Linux !== newConfig.System.Binaries.ffmpeg.Linux) newConfig.System.Binaries.ffmpeg.Linux = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.ffmpeg.Linux));
	if (oldConfig.System.Binaries.ffmpeg.OSX !== newConfig.System.Binaries.ffmpeg.OSX) newConfig.System.Binaries.ffmpeg.OSX = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.ffmpeg.OSX));
	if (oldConfig.System.Binaries.Postgres.Windows !== newConfig.System.Binaries.Postgres.Windows)  newConfig.System.Binaries.Postgres.Windows = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.Postgres.Windows));
	if (oldConfig.System.Binaries.Postgres.Linux !== newConfig.System.Binaries.Postgres.Linux) newConfig.System.Binaries.Postgres.Linux = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.Postgres.Linux));
	if (oldConfig.System.Binaries.Postgres.OSX !== newConfig.System.Binaries.Postgres.OSX) newConfig.System.Binaries.Postgres.OSX = relativePath(state.originalAppPath, resolve(state.originalAppPath, newConfig.System.Binaries.Postgres.OSX));
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
	const config = setConfig(newConfig);
	setSongPoll(config.Karaoke.Poll.Enabled);
	// Toggling twitch
	try {
		config.Karaoke.StreamerMode.Twitch.Enabled && !state.isDemo
			? initTwitch()
			: stopTwitch();
	} catch(err) {
		logger.warn('Could not start/stop Twitch chat bot', {service: 'Config', obj: err});
	}
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
	// Toggling progressbar off if needs be
	if (config.Player.ProgressBarDock && !state.isDemo) setProgressBar(-1);
	if (!state.isDemo) configureHost();
}

/** Initializing configuration */
export async function initConfig(argv: any) {
	try {
		setConfigConstraints(configConstraints);
		await loadConfigFiles(getState().dataPath, argv.config, defaults, getState().originalAppPath);
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
	const config = getConfig();
	const URLPort = +config.Online.Port === 80
		? ''
		: `:${config.Frontend.Port}`;
	setState({osHost: {v4: address(undefined, 'ipv4'), v6: address(undefined, 'ipv6')}});
	if (config.Online.URL) {
		setState({osURL: `http://${config.Online.Host}`});
	} else {
		if (!config.Karaoke.Display.ConnectionInfo.Host) {
			setState({osURL: `http://${getState().osHost.v4}${URLPort}`}); // v6 is too long to show anyway
		} else {
			setState({osURL: `http://${config.Karaoke.Display.ConnectionInfo.Host}${URLPort}`});
		}
	}
}

function getFirstHop(target: string): Promise<string> {
	return new Promise((resolve1, reject) => {
		// Traceroute way
		try {
			const tracer = new Traceroute('ipv6');
			tracer.on('hop', (hop: any) => {
				resolve1(hop.ip);
			});
			tracer.trace(target);
		} catch (e) {
			logger.error('Cannot traceroute', {service: 'Network'});
			reject(e);
		}
	});
}

export async function determineV6Prefix(ipv6: string): Promise<string> {
	/**
	 * IPv6 is made to protect privacy by making complex the task of getting the information about prefixes
	 * This code tries to determine what's the network prefix via different methods
	 */
	// TODO: Find more accurate ways to do this
	// Resolve ASN using whois
	const asn = await whoisIP(ipv6);
	if (typeof ASNPrefixes[asn.asn] === 'number') {
		const subnet = createCIDR(ipv6, ASNPrefixes[asn.asn]);
		return subnet.toString();
	}
	// Traceroute way
	const hop = await getFirstHop('kara.moe');
	logger.debug(`Determined gateway: ${hop}`, {service: 'Network'});
	const local = getState().osHost.v6;
	let found = false;
	let prefix = 56;
	let subnet = createCIDR(local, prefix);
	while (subnet.contains(hop)) {
		subnet = createCIDR(local, ++prefix);
		found = true;
	}
	if (found) {
		subnet = createCIDR(local, --prefix);
		logger.debug(`Determined IPv6 prefix: ${subnet.toString()}`, {service: 'Network'});
		return subnet.toString();
	} else {
		logger.warn('Could not determine IPv6 prefix, disabling IPv6 capability on shortener.', {service: 'Network'});
		throw new Error('Cannot find CIDR');
	}
}

/** Create a backup of our config file. Just in case. */
export function backupConfig() {
	logger.debug('Making a backup of config.yml', {service: 'Config'});
	return asyncCopy(
		resolve(getState().dataPath, 'config.yml'),
		resolve(getState().dataPath, 'config.backup.yml'),
		{ overwrite: true }
	);
}

/** Return public configuration (without sensitive data) */
export function getPublicConfig(removeSystem = true) {
	const publicSettings = cloneDeep(getConfig());
	delete publicSettings.App.JwtSecret;
	delete publicSettings.Database;
	if (removeSystem) delete publicSettings.System;
	publicSettings.Karaoke.StreamerMode.Twitch.OAuth = '*********';
	return publicSettings;
}

/** Check if binaries are available. Provide their paths for runtime */
async function checkBinaries(config: Config): Promise<BinariesConfig> {
	const binariesPath = configuredBinariesForSystem(config);
	const requiredBinariesChecks = [];
	requiredBinariesChecks.push(asyncRequired(binariesPath.ffmpeg));
	if (config.Database.prod.bundledPostgresBinary) {
		requiredBinariesChecks.push(asyncRequired(resolve(binariesPath.postgres, binariesPath.postgres_ctl)));
		if (process.platform === 'win32') {
			requiredBinariesChecks.push(asyncRequired('C:/Windows/System32/msvcr120.dll'));
			requiredBinariesChecks.push(asyncRequired('C:/Windows/System32/msvcp120.dll'));
		}
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
async function binMissing(binariesPath: any, err: string) {
	logger.error('One or more binaries could not be found!', {service: 'BinCheck', obj: err});
	logger.error('Paths searched : ', {service: 'BinCheck'});
	logger.error(`ffmpeg: ${binariesPath.ffmpeg}`, {service: 'BinCheck'});
	logger.error(`mpv: ${binariesPath.mpv}`, {service: 'BinCheck'});
	logger.error(`postgres: ${binariesPath.postgres}`, {service: 'BinCheck'});
	logger.error('Exiting...', {service: 'BinCheck'});
	const error = i18next.t('MISSING_BINARIES.MESSAGE', {err: err});
	console.log(error);
	if (dialog) {
		await dialog.showMessageBox({
			type: 'none',
			title: i18next.t('MISSING_BINARIES.TITLE'),
			message: error
		});
	}
}

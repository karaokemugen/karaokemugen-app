/** Centralized configuration management for Karaoke Mugen. */

// Node modules
import { dialog } from 'electron';
import { copy } from 'fs-extra';
import i18next from 'i18next';
import { address } from 'ip';
import { cloneDeep, isEqual, merge } from 'lodash';
import { resolve } from 'path';

import { selectUsers } from '../dao/user.js';
import { applyMenu } from '../electron/electron.js';
import { errorStep } from '../electron/electronLogger.js';
import { registerShortcuts, unregisterShortcuts } from '../electron/electronShortcuts.js';
import { refreshTags } from '../lib/dao/tag.js';
import { RecursivePartial } from '../lib/types/index.js';
import { PlaylistMediaType } from '../lib/types/playlistMedias.js';
import {
	changeLanguage,
	configureIDs,
	getConfig,
	loadConfigFiles,
	setConfig,
	setConfigConstraints,
	verifyConfig,
} from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { fileRequired, relativePath } from '../lib/utils/files.js';
// KM Imports
import logger from '../lib/utils/logger.js';
import { removeNulls } from '../lib/utils/objectHelpers.js';
import { emit } from '../lib/utils/pubsub.js';
import { emitWS } from '../lib/utils/ws.js';
import {
	displayInfo,
	displayQRCode,
	hideQRCode,
	initAddASongMessage,
	playerNeedsRestart,
	prepareClassicPauseScreen,
	stopAddASongMessage,
} from '../services/player.js';
import { setSongPoll } from '../services/poll.js';
import { destroyRemote, initRemote } from '../services/remote.js';
import { initStats, stopStats } from '../services/stats.js';
import { updateSongsLeft } from '../services/user.js';
import { BinariesConfig } from '../types/binChecker.js';
import { Config } from '../types/config.js';
import { supportedLanguages } from './constants.js';
import { configConstraints, defaults } from './defaultSettings.js';
import { initDiscordRPC, stopDiscordRPC } from './discordRPC.js';
import { initKMServerCommunication } from './kmserver.js';
import { createQRCodeFile } from './qrcode.js';
import sentry from './sentry.js';
import { getState, setState } from './state.js';
import { writeStreamFiles } from './streamerFiles.js';
import { initTwitch, stopTwitch } from './twitch.js';

const service = 'Config';

/** Edit a config item, verify the new config is valid, and act according to settings changed */
export async function editSetting(part: RecursivePartial<Config>) {
	try {
		const config = getConfig();
		const oldConfig = removeNulls(cloneDeep(config));
		const newConfig = removeNulls(merge(config, part));
		try {
			verifyConfig(newConfig);
		} catch (err) {
			logger.warn(`Config error: ${err}`, { service });
			throw new ErrorKM('INVALID_CONFIG', 400, false);
		}
		await mergeConfig(newConfig, oldConfig);
		emitWS('settingsUpdated', part);
		return config;
	} catch (err) {
		sentry.error(err, 'warning');
		throw err instanceof ErrorKM ? err : new ErrorKM('SETTINGS_UPDATE_ERROR');
	}
}

/** Merge and act according to config changes */
export async function mergeConfig(newConfig: Config, oldConfig: Config) {
	// Determine if mpv needs to be restarted
	const state = getState();
	// Collections changed!
	if (!isEqual(oldConfig.Karaoke.Collections, newConfig.Karaoke.Collections)) {
		if (state.DBReady) refreshTags();
	}
	if (!isEqual(oldConfig.Player, newConfig.Player)) {
		// If these settings have been changed, a restart of mpv is necessary
		if (
			oldConfig.Player.mpvVideoOutput !== newConfig.Player.mpvVideoOutput ||
			oldConfig.Player.ExtraCommandLine !== newConfig.Player.ExtraCommandLine ||
			oldConfig.Player.Monitor !== newConfig.Player.Monitor ||
			oldConfig.Player.Screen !== newConfig.Player.Screen ||
			oldConfig.Player.PIP.Size !== newConfig.Player.PIP.Size ||
			oldConfig.Player.PIP.PositionX !== newConfig.Player.PIP.PositionX ||
			oldConfig.Player.PIP.PositionY !== newConfig.Player.PIP.PositionY
		) {
			playerNeedsRestart();
		}
		if (
			oldConfig.Player.Display.ConnectionInfo.Message !== newConfig.Player.Display.ConnectionInfo.Message &&
			(getState().player.mediaType === 'pause' || getState().player.mediaType === 'stop')
		) {
			displayInfo();
		}
	}
	if (newConfig.Online.Remote !== oldConfig.Online.Remote && state.ready) {
		if (newConfig.Online.Remote) {
			await initKMServerCommunication();
			initRemote();
		} else {
			destroyRemote();
		}
	}
	// Change language
	if (newConfig.App.Language !== oldConfig.App.Language) {
		changeLanguage(newConfig.App.Language);
	}
	// Updating quotas
	if (
		newConfig.Karaoke.Quota.Type !== oldConfig.Karaoke.Quota.Type ||
		newConfig.Karaoke.Quota.Songs !== oldConfig.Karaoke.Quota.Songs ||
		newConfig.Karaoke.Quota.Time !== oldConfig.Karaoke.Quota.Time
	) {
		const users = await selectUsers();
		for (const user of users) {
			updateSongsLeft(user.login, getState().publicPlaid);
		}
	}
	if (!newConfig.Karaoke.ClassicMode) setState({ currentRequester: null });
	if (newConfig.Karaoke.ClassicMode && state.player.playerStatus === 'stop') prepareClassicPauseScreen();

	// Browse through paths and define if it's relative or absolute
	if (oldConfig.System.Binaries.Player.Windows !== newConfig.System.Binaries.Player.Windows) {
		newConfig.System.Binaries.Player.Windows = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.Player.Windows)
		);
	}
	if (oldConfig.System.Binaries.Player.Linux !== newConfig.System.Binaries.Player.Linux) {
		newConfig.System.Binaries.Player.Linux = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.Player.Linux)
		);
	}
	if (oldConfig.System.Binaries.Player.OSX !== newConfig.System.Binaries.Player.OSX) {
		newConfig.System.Binaries.Player.OSX = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.Player.OSX)
		);
	}
	if (oldConfig.System.Binaries.ffmpeg.Windows !== newConfig.System.Binaries.ffmpeg.Windows) {
		newConfig.System.Binaries.ffmpeg.Windows = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.ffmpeg.Windows)
		);
	}
	if (oldConfig.System.Binaries.ffmpeg.Linux !== newConfig.System.Binaries.ffmpeg.Linux) {
		newConfig.System.Binaries.ffmpeg.Linux = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.ffmpeg.Linux)
		);
	}
	if (oldConfig.System.Binaries.ffmpeg.OSX !== newConfig.System.Binaries.ffmpeg.OSX) {
		newConfig.System.Binaries.ffmpeg.OSX = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.ffmpeg.OSX)
		);
	}
	if (oldConfig.System.Binaries.Postgres.Windows !== newConfig.System.Binaries.Postgres.Windows) {
		newConfig.System.Binaries.Postgres.Windows = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.Postgres.Windows)
		);
	}
	if (oldConfig.System.Binaries.Postgres.Linux !== newConfig.System.Binaries.Postgres.Linux) {
		newConfig.System.Binaries.Postgres.Linux = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.Postgres.Linux)
		);
	}
	if (oldConfig.System.Binaries.Postgres.OSX !== newConfig.System.Binaries.Postgres.OSX) {
		newConfig.System.Binaries.Postgres.OSX = relativePath(
			state.appPath,
			resolve(state.appPath, newConfig.System.Binaries.Postgres.OSX)
		);
	}
	Object.keys(newConfig.System.Repositories).forEach((_, i) => {
		for (const path of Object.keys(newConfig.System.Repositories[i].Path)) {
			if (!isEqual(newConfig.System.Repositories[i].Path[path], oldConfig.System.Repositories[i].Path[path])) {
				if (Array.isArray(newConfig.System.Repositories[i].Path[path])) {
					newConfig.System.Repositories[i].Path[path].forEach((_grumble: any, y: number) => {
						newConfig.System.Repositories[i].Path[path][y] = relativePath(
							state.dataPath,
							resolve(state.dataPath, newConfig.System.Repositories[i].Path[path][y])
						);
					});
				} else {
					newConfig.System.Repositories[i].Path[path] = relativePath(
						state.dataPath,
						resolve(state.dataPath, newConfig.System.Repositories[i].Path[path])
					);
				}
			}
		}
	});
	for (const path of Object.keys(newConfig.System.Path)) {
		if (!isEqual(newConfig.System.Path[path], oldConfig.System.Path[path])) {
			if (Array.isArray(newConfig.System.Path[path])) {
				newConfig.System.Path[path].forEach((_: any, i: number) => {
					newConfig.System.Path[path][i] = relativePath(
						state.dataPath,
						resolve(state.dataPath, newConfig.System.Path[path][i])
					);
				});
			} else {
				newConfig.System.Path[path] = relativePath(
					state.dataPath,
					resolve(state.dataPath, newConfig.System.Path[path])
				);
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
	config.Karaoke.StreamerMode.Twitch.Enabled
		? initTwitch().catch(err => {
				logger.warn('Could not start Twitch chat bot', { service, obj: err });
			})
		: stopTwitch().catch(err => {
				logger.warn('Could not stop Twitch chat bot', { service, obj: err });
			});
	// Toggling random song after end message
	config.Playlist.RandomSongsAfterEndMessage ? initAddASongMessage() : stopAddASongMessage();
	// Toggling Discord RPC
	config.Online.Discord.DisplayActivity ? initDiscordRPC() : stopDiscordRPC();
	// Toggling stats
	config.Online.Stats ? initStats(newConfig.Online.Stats === oldConfig.Online.Stats) : stopStats();
	// Streamer mode
	if (config.Karaoke.StreamerMode.Enabled) writeStreamFiles();

	configureHost();

	// Exiting first run, display full menu.
	if (oldConfig.App.FirstRun && !config.App.FirstRun) {
		applyMenu('DEFAULT');
	}
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
		for (const repo of publicConfig.System.Repositories) {
			if (repo.MaintainerMode) {
				if (repo.FTP?.Password) repo.FTP.Password = 'xxxxx';
				if (repo.Git?.Password) repo.Git.Password = 'xxxxx';
			}
		}
		logger.debug('Loaded configuration', { service, obj: publicConfig });
		await checkBinaries(getConfig());
		emit('configReady');
		configureHost();
		configureIDs();
		if (!getConfig().App.Language) {
			// First time, let's find out if our locale is in supported languages. If not, set to english
			if (!supportedLanguages.includes(getState().defaultLocale)) {
				setConfig({ App: { Language: 'en' } });
			} else {
				setConfig({ App: { Language: getState().defaultLocale } });
			}
		}
		changeLanguage(getConfig().App.Language);
		return getConfig();
	} catch (err) {
		logger.error('InitConfig failed', { service, obj: err });
		throw err;
	}
}

/** Detect and set hostname and local IP */
export async function configureHost() {
	const state = getState();
	const config = getConfig();
	const URLPort = +config.System.FrontendPort === 80 ? '' : `:${config.System.FrontendPort}`;
	setState({ osHost: { v4: address(undefined, 'ipv4'), v6: address(undefined, 'ipv6') } });
	if (state.remoteAccess && 'host' in state.remoteAccess) {
		setState({ osURL: `https://${state.remoteAccess.host}` });
	} else if (!config.Player.Display.ConnectionInfo.Host) {
		setState({ osURL: `http://${getState().osHost.v4}${URLPort}` }); // v6 is too long to show anyway
	} else {
		setState({ osURL: `http://${config.Player.Display.ConnectionInfo.Host}${URLPort}` });
	}
	if (config.Player.Display.ConnectionInfo.QRCode) {
		await createQRCodeFile(getState().osURL);
	}
	if (
		(state.player.mediaType === 'stop' ||
			state.player.mediaType === 'pause' ||
			state.player.mediaType === 'poll') &&
		!state.songPoll
	) {
		displayInfo();
		if (config.Player.Display.ConnectionInfo.QRCode) {
			displayQRCode();
		} else {
			hideQRCode();
		}
	}
	writeStreamFiles('km_url');
}

/** Create a backup of our config file. Just in case. */
export function backupConfig() {
	logger.debug('Making a backup of config.yml', { service });
	try {
		return copy(
			resolve(getState().dataPath, 'config.yml'),
			resolve(getState().dataPath, `config.backup.${new Date().getTime().toString()}.yml`),
			{ overwrite: true }
		);
	} catch (err) {
		logger.error(`Unable to backup config : ${err}`);
		sentry.error(err);
		throw new ErrorKM('CONFIG_BACKUPED_ERROR');
	}
}

/** Return public configuration (without sensitive data) */
export function getPublicConfig(removeSystem = true) {
	const publicSettings = cloneDeep(getConfig());
	delete publicSettings.App.InstanceID;
	delete publicSettings.App.JwtSecret;
	delete publicSettings.System.Database;
	for (const repo of publicSettings.System.Repositories) {
		if (repo.MaintainerMode) {
			delete repo.Git?.Password;
			delete repo.FTP?.Password;
		}
	}
	if (removeSystem) delete publicSettings.System;
	else delete publicSettings.System.Binaries;
	delete publicSettings.Karaoke.StreamerMode.Twitch.OAuth;
	return publicSettings;
}

/** Check if binaries are available. Provide their paths for runtime */
export async function checkBinaries(config: Config) {
	const binariesPath = configuredBinariesForSystem(config);
	const requiredBinariesChecks = [];
	requiredBinariesChecks.push(fileRequired(binariesPath.ffmpeg));
	requiredBinariesChecks.push(fileRequired(binariesPath.patch));
	if (config.System.Database.bundledPostgresBinary) {
		requiredBinariesChecks.push(fileRequired(resolve(binariesPath.postgres, binariesPath.postgres_ctl)));
	}
	if (!getState().isTest) requiredBinariesChecks.push(fileRequired(binariesPath.mpv));

	try {
		await Promise.all(requiredBinariesChecks);
		setState({ binPath: binariesPath });
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
				postgres_client: 'psql.exe',
			};
		case 'darwin':
			return {
				ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.OSX),
				mpv: resolve(getState().appPath, config.System.Binaries.Player.OSX),
				postgres: resolve(getState().appPath, config.System.Binaries.Postgres.OSX),
				patch: resolve(getState().appPath, config.System.Binaries.patch.OSX),
				postgres_ctl: 'pg_ctl',
				postgres_dump: 'pg_dump',
				postgres_client: 'psql',
			};
		default:
			return {
				ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Linux),
				mpv: resolve(getState().appPath, config.System.Binaries.Player.Linux),
				postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Linux),
				patch: resolve(getState().appPath, config.System.Binaries.patch.Linux),
				postgres_ctl: 'pg_ctl',
				postgres_dump: 'pg_dump',
				postgres_client: 'psql',
			};
	}
}

/** Error out on missing binaries */
async function binMissing(binariesPath: any, err: string) {
	logger.error('One or more binaries could not be found!', { service, obj: err });
	logger.error('Paths searched : ', { service });
	logger.error(`ffmpeg: ${binariesPath.ffmpeg}`, { service });
	logger.error(`mpv: ${binariesPath.mpv}`, { service });
	logger.error(`postgres: ${binariesPath.postgres}`, { service });
	logger.error(`patch: ${binariesPath.patch}`, { service });
	logger.error('Exiting...', { service });
	const error = `${i18next.t('MISSING_BINARIES.MESSAGE')}\n\n${err}`;
	console.log(error);
	if (dialog) {
		await dialog.showMessageBox({
			type: 'none',
			title: i18next.t('MISSING_BINARIES.TITLE'),
			message: error,
		});
	}
}

export function resolvedMediaPath(type: PlaylistMediaType) {
	return getConfig().System.MediaPath[type].map((path: string) => resolve(getState().dataPath, path));
}

/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {address} from 'ip';
import {configureLogger} from '../lib/utils/logger';
import logger from 'winston';
import {asyncCopy} from '../lib/utils/files';
import {configureIDs, configureLocale, loadConfigFiles, setConfig, verifyConfig, getConfig, setConfigConstraints} from '../lib/utils/config';
import {configConstraints, defaults} from './default_settings';
import {publishURL} from '../webapp/online';
import {playerNeedsRestart} from '../services/player';
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
import {version} from '../version';
import { emit } from '../lib/utils/pubsub';

/*
const defaultConfig: Config = {
	App: {},
	Online: {},
	Frontend: {
		Permissions: {}
	},
	Karaoke: {
		Display: {
			ConnectionInfo: {}
		},
		Poll: {},
		Quota: {}
	},
	Player: {
		PIP: {}
	},
	Playlist: {},
	System: {
		Binaries: {
			Player: {},
			Postgres: {},
			ffmpeg: {}
		},
		Path: {}
	},
	Database: {
		prod: {}
	}
}
*/

export async function editSetting(part: object) {
	const config = getConfig();
	const oldConfig = cloneDeep(config);
	const newConfig = merge(config, part);
	verifyConfig(newConfig);
	await mergeConfig(newConfig, oldConfig);
	emitWS('settingsUpdated', config);
	return config;
}

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
		users.map(u => u.login).forEach(username => {
			updateSongsLeft(username, getState().modePlaylistID);
		});
	}

	const config = setConfig(newConfig);
	setSongPoll(config.Karaoke.Poll.Enabled);
	// Toggling stats
	if (config.Online.Stats) {
		initStats(newConfig.Online.Stats === oldConfig.Online.Stats);
	} else {
		stopStats();
	}
	// Toggling and updating settings
	setState({private: config.Karaoke.Private});
	configureHost();
}

/** Initializing configuration */
export async function initConfig(argv: any) {
	let appPath = getState().appPath;
	setState({ version: version });
	setConfigConstraints(configConstraints);
	await configureLogger(appPath, !!argv.debug);
	await configureLocale();
	await loadConfigFiles(appPath, argv.config, defaults);
	emit('configReady');
	configureHost();
	configureIDs();
	return getConfig();
}

export function configureHost() {
	const config = getConfig();
	let URLPort = `:${config.Frontend.Port}`;
	setState({osHost: address()});
	if (+config.Online.Port === 80) URLPort = '';
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


export async function backupConfig() {
	// Create a backup of our config file. Just in case.
	logger.debug('[Config] Making a backup of config.yml');
	return await asyncCopy(
		resolve(getState().appPath, 'config.yml'),
		resolve(getState().appPath, 'config.backup.yml'),
		{ overwrite: true }
	);
}

export function getPublicConfig() {
	const publicSettings = {...getConfig()};
	delete publicSettings.App;
	delete publicSettings.Database;
	delete publicSettings.System;
	return publicSettings;
}
/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import osLocale from 'os-locale';
import i18n from 'i18n';
import {address} from 'ip';
import {configureLogger} from './logger';
import logger from 'winston';
import {copy} from 'fs-extra';
import {asyncExists, asyncReadFile, asyncRequired, asyncWriteFile} from './files';
import {checkBinaries} from './binchecker';
import uuidV4 from 'uuid/v4';
import {configConstraints, defaults} from './default_settings';
import {check} from './validators';
import {publishURL} from '../webapp/online';
import {playerNeedsRestart} from '../services/player';
import {getState, setState} from './state';
import testJSON from 'is-valid-json';
import {setSongPoll} from '../services/poll';
import {initStats, stopStats} from '../services/stats';
import merge from 'lodash.merge';
import isEqual from 'lodash.isequal';
import {safeDump, safeLoad} from 'js-yaml';
import {clearEmpties, difference} from './object_helpers';
import cloneDeep from 'lodash.clonedeep';
import {version} from '../version';
import {Config} from '../types/config';
import { listUsers } from '../dao/user';
import { updateSongsLeft } from '../services/user';

/** Object containing all config */
let config: Config = getDefaultConfig();
let configFile = 'config.yml';
let configReady = false;

/**
 * We return a copy of the configuration data so the original one can't be modified
 * without passing by this module's functions.
 */
export function getConfig(): Config {
	return {...config};
}

export async function editSetting(part: object) {
	const oldConfig = cloneDeep(config);
	const newConfig = merge(config, part);
	verifyConfig(newConfig);
	await mergeConfig(newConfig, oldConfig);
	return config;
}

export function verifyConfig(conf: Config) {
	const validationErrors = check(conf, configConstraints);
	if (validationErrors) {
		throw `Config is not valid: ${JSON.stringify(validationErrors)}`;
	}
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

	// Toggling stats
	if (config.Online.Stats) {
		initStats(newConfig.Online.Stats === oldConfig.Online.Stats);
	} else {
		stopStats();
	}

	setConfig(newConfig);
	setSongPoll(config.Karaoke.Poll.Enabled);

	// Toggling and updating settings
	setState({private: config.Karaoke.Private});
	configureHost();
}

function getDefaultConfig(): Config {
	return {
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
	};
}

/** Initializing configuration */
export async function initConfig(argv: any) {
	let appPath = getState().appPath;
	if (argv.config) configFile = argv.config;
	await configureLogger(appPath, !!argv.debug);
	await configureLocale();

	await loadConfigFiles(appPath);
	configReady = true;
	configureHost();
	if (config.App.JwtSecret === 'Change me') setConfig({App: {JwtSecret: uuidV4() }});
	if (config.App.InstanceID === 'Change me') setConfig({App: {InstanceID: uuidV4() }});
	return getConfig();
}

async function loadConfigFiles(appPath: string) {
	const overrideConfigFile = resolve(appPath, configFile);
	const databaseConfigFile = resolve(appPath, 'database.json');
	config = merge(config, defaults);
	setState({
		appPath: appPath,
		version: version
	});
	if (await asyncExists(overrideConfigFile)) await loadConfig(overrideConfigFile);
	if (await asyncExists(databaseConfigFile)) {
		const dbConfig = await loadDBConfig(databaseConfigFile);
		config.Database = merge(config.Database, dbConfig);
	}
}

async function loadDBConfig(configFile: string) {
	const configData = await asyncReadFile(configFile, 'utf-8');
	if (!testJSON(configData)) {
		logger.error('[Config] Database config file is not valid JSON');
		throw 'Syntax error in database.json';
	}
	return JSON.parse(configData);
}

async function loadConfig(configFile: string) {
	logger.debug(`[Config] Reading configuration file ${configFile}`);
	await asyncRequired(configFile);
	const content = await asyncReadFile(configFile, 'utf-8');
	const parsedContent = safeLoad(content);
	const newConfig = merge(config, parsedContent);
	verifyConfig(newConfig);
	config = {...newConfig};
}

async function configureLocale() {
	i18n.configure({
		directory: resolve(__dirname, '../locales'),
		defaultLocale: 'en',
		cookie: 'locale',
		register: global
	});
	let detectedLocale = await osLocale();
	detectedLocale = detectedLocale.substring(0, 2);
	i18n.setLocale(detectedLocale);
	setState( {EngineDefaultLocale: detectedLocale });
}

export async function configureBinaries(config) {
	logger.debug('[Launcher] Checking if binaries are available');
	const binaries = await checkBinaries(config);
	setState({binPath: binaries});
}

export function configureHost() {
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

export async function setConfig(configPart: any) {
	config = merge(config, configPart);
	if (configReady) updateConfig(config);
	return getConfig();
}

export async function backupConfig() {
	// Create a backup of our config file. Just in case.
	logger.debug('[Config] Making a backup of config.yml');
	return await copy(
		resolve(getState().appPath, 'config.yml'),
		resolve(getState().appPath, 'config.backup.yml'),
		{ overwrite: true }
	);
}

export function getPublicConfig() {
	const publicSettings = {...config};
	delete publicSettings.App;
	delete publicSettings.Database;
	delete publicSettings.System;
	return publicSettings;
}

export async function updateConfig(newConfig: Config) {
	const filteredConfig = difference(newConfig, defaults);
	clearEmpties(filteredConfig);
	if (filteredConfig.Database) delete filteredConfig.Database;
	logger.debug('[Config] Settings being saved : '+JSON.stringify(filteredConfig));
	await asyncWriteFile(resolve(getState().appPath, configFile), safeDump(filteredConfig), 'utf-8');
}

/**
 * Functions used to manipulate configuration. We can pass a optional config object.
 * In this case, the method works with the configuration passed as argument rather than the current
 * configuration.
 */

export function resolvedPathKaras() {
	return config.System.Path.Karas.map(path => resolve(getState().appPath, path));
}

export function resolvedPathSeries() {
	return config.System.Path.Series.map(path => resolve(getState().appPath, path));
}

export function resolvedPathJingles() {
	return config.System.Path.Jingles.map(path => resolve(getState().appPath, path));
}

export function resolvedPathBackgrounds() {
	return config.System.Path.Backgrounds.map(path => resolve(getState().appPath, path));
}

export function resolvedPathSubs() {
	return config.System.Path.Lyrics.map(path => resolve(getState().appPath, path));
}

export function resolvedPathMedias() {
	return config.System.Path.Medias.map(path => resolve(getState().appPath, path));
}

export function resolvedPathImport() {
	return resolve(getState().appPath, config.System.Path.Import);
}

export function resolvedPathTemp() {
	return resolve(getState().appPath, config.System.Path.Temp);
}

export function resolvedPathPreviews() {
	return resolve(getState().appPath, config.System.Path.Previews);
}

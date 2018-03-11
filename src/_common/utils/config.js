/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {parse, stringify} from 'ini';
import {sync} from 'os-locale';
import i18n from 'i18n';
import {address} from 'ip';
import logger from 'winston';
require('winston-daily-rotate-file');
import {asyncWriteFile, asyncExists, asyncReadFile, asyncRequired} from './files';
import {checkBinaries} from './binchecker.js';
import uuidV4 from 'uuid/v4';
import {watch} from 'chokidar';
import {emit} from './pubsub';
import {defaults} from './default_settings.js';

/** Object containing all config */
let config = {};
let defaultConfig = {};

/**
 * We return a copy of the configuration data so the original one can't be modified
 * without passing by this module's fonctions.
 */
export function getConfig() {
	return {...config};
}

export function mergeConfig(newConfig) {
	let conf = getConfig();
	// Determine if mpv needs to be restarted
	for (const setting in newConfig) {
		if (setting.startsWith('Player') &&
			setting != 'PlayerFullscreen' &&
			setting != 'PlayerStayOnTop') {
			if (conf[setting] != newConfig[setting]) {
				emit('playerNeedsRestart');
				logger.debug('[Engine] Setting mpv to restart after next song');
			}
		}
	}

	updateConfig(newConfig);
	conf = getConfig();
	// Toggling and updating settings
	if (conf.EnginePrivateMode === 1) {
		emit('modeUpdated',0);
	} else {
		emit('modeUpdated',1);
	}

	configureHost();

	// Determine which settings we send back. We get rid of all system and admin settings
	let publicSettings = {};
	for (const key in conf) {
		if (conf.hasOwnProperty(key)) {
			if (!key.startsWith('Path') &&
				!key.startsWith('Admin') &&
				!key.startsWith('Bin') &&
				!key.startsWith('os')
			) {
				publicSettings[key] = conf[key];
			}
		}
	}
	return publicSettings;
}

/** Initializing configuration */
export async function initConfig(appPath, argv) {

	configureLogger(appPath, !!argv.debug);

	config = {...config, appPath: appPath};
	config = {...config, isTest: !!argv.test};
	config = {...config, os: process.platform};

	configureLocale();
	await loadConfigFiles(appPath);
	configureHost();
	if (config.JwtSecret == 'Change me') setConfig( {JwtSecret: uuidV4() });

	//Configure watcher
	const configWatcher = watch(resolve(appPath, 'config.ini'));
	configWatcher.on('change', () => {
		logger.debug('[Config] Config file has been changed from the outside world');
		loadConfig(resolve(appPath, 'config.ini')).then(() => {
			mergeConfig(getConfig());
		});
	});

	return getConfig();
}

function configureLogger(appPath, debug) {
	const tsFormat = () => (new Date()).toLocaleTimeString();
	const consoleLogLevel = debug ? 'debug' : 'info';

	logger.configure({
		transports: [
			new (logger.transports.Console)({
				timestamp: tsFormat,
				level: consoleLogLevel,
				colorize: true
			}),
			new (logger.transports.DailyRotateFile)({
				timestap: tsFormat,
				filename: resolve(appPath, 'karaokemugen'),
				datePattern: '.yyyy-MM-dd.log',
				zippedArchive: true,
				level: 'debug',
				handleExceptions: true
			})
		]
	});
}

async function loadConfigFiles(appPath) {
	const overrideConfigFile = resolve(appPath, 'config.ini');
	const versionFile = resolve(__dirname, '../../VERSION');

	config = {...config, ...defaults};
	config.appPath = appPath;
	if (await asyncExists(overrideConfigFile)) await loadConfig(overrideConfigFile);
	if (await asyncExists(versionFile)) await loadConfig(versionFile);
}

async function loadConfig(configFile) {
	logger.debug(`[Config] Reading configuration file ${configFile}`);
	await asyncRequired(configFile);
	const content = await asyncReadFile(configFile, 'utf-8');
	const parsedContent = parse(content);
	config = {...config, ...parsedContent};
}

function configureLocale() {
	i18n.configure({
		directory: resolve(__dirname, '../locales'),
		defaultLocale: 'en',
		cookie: 'locale',
		register: global
	});
	const detectedLocale = sync().substring(0, 2);
	i18n.setLocale(detectedLocale);
	config = {...config, EngineDefaultLocale: detectedLocale };
}

export async function configureBinaries(config) {
	logger.debug('[Launcher] Checking if binaries are available');
	const binaries = await checkBinaries(config);
	setConfig(binaries);
}

export function configureHost() {
	if (config.EngineDisplayConnectionInfoHost === '') {
		config = {...config, osHost: address()};
	} else {
		config = {...config, osHost: config.EngineDisplayConnectionInfoHost};
	}
}

export async function setConfig(configPart) {
	config = {...config, ...configPart};
	await updateConfig(config);
	return getConfig();
}

export async function updateConfig(newConfig) {
	const forbiddenConfigPrefix = ['opt','Admin','BinmpvPath','BinffprobePath','BinffmpegPath','Version','isTest','appPath','os','EngineDefaultLocale'];
	const filteredConfig = {};
	Object.entries(newConfig).forEach(([k, v]) => {
		forbiddenConfigPrefix.every(prefix => !k.startsWith(prefix))
			&& (newConfig[k] != defaultConfig[k])
            && (filteredConfig[k] = v);
	});
	logger.debug('[Config] Settings being saved : '+JSON.stringify(filteredConfig));
	await asyncWriteFile(resolve(config.appPath, 'config.ini'), stringify(filteredConfig), 'utf-8');
}

/**
 * Functions used to manipulate configuration. We can pass a optional config object.
 * In this case, the method works with the configuration passed as argument rather than the current
 * configuration.
 */

export function resolvedPathKaras(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return conf.PathKaras.split('|').map(path => resolve(conf.appPath, path));
}

export function resolvedPathJingles(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return conf.PathJingles.split('|').map(path => resolve(conf.appPath, path));
}

export function resolvedPathBackgrounds(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return conf.PathBackgrounds.split('|').map(path => resolve(conf.appPath, path));
}

export function resolvedPathSubs(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return conf.PathSubs.split('|').map(path => resolve(conf.appPath, path));
}

export function resolvedPathVideos(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return conf.PathVideos.split('|').map(path => resolve(conf.appPath, path));
}

export function resolvedPathImport(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return resolve(conf.appPath, conf.PathImport);
}

export function resolvedPathTemp(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return resolve(conf.appPath, conf.PathTemp);
}

export function resolvedPathPreviews(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return resolve(conf.appPath, conf.PathPreviews);
}
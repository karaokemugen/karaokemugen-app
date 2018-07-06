/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {parse, stringify} from 'ini';
import osLocale from 'os-locale';
import i18n from 'i18n';
import {address} from 'ip';
import {configureLogger} from './logger';
import logger from 'winston';
import {copy} from 'fs-extra';
import {asyncWriteFile, asyncExists, asyncReadFile, asyncRequired} from './files';
import {checkBinaries} from './binchecker.js';
import uuidV4 from 'uuid/v4';
import {watch} from 'chokidar';
import {configConstraints, defaults} from './default_settings.js';
import {check, unescape} from './validators';
import {publishURL} from '../../_webapp/online';
import {playerNeedsRestart} from '../../_services/engine';
import {setState} from './state';

/** Object containing all config */
let config = {};
let configFile = 'config.ini';
let savingSettings;

/**
 * We return a copy of the configuration data so the original one can't be modified
 * without passing by this module's functions.
 */
export function getConfig() {
	return {...config};
}

export function sanitizeConfig(conf) {
	for (const setting of Object.keys(conf)) {
		if (/^\+?(0|[1-9]\d*)$/.test(conf[setting])) {
			conf[setting] = parseInt(conf[setting], 10);
		}
		if (setting === 'EngineDisplayConnectionInfoMessage' ||
		    setting === 'EngineDisplayConnectionInfoHost') {
			conf[setting] = unescape(conf[setting].trim());
		}
	}
	return conf;
}

export function verifyConfig(conf) {
	const validationErrors = check(conf, configConstraints);
	if (validationErrors) {
		throw `Config is not valid: ${JSON.stringify(validationErrors)}`;
	}
}

export async function mergeConfig(oldConfig, newConfig) {
	// Determine if mpv needs to be restarted
	for (const setting in newConfig) {
		if (setting.startsWith('Player') &&
			setting !== 'PlayerFullscreen' &&
			setting !== 'PlayerStayOnTop') {
			if (oldConfig[setting] != newConfig[setting]) {
				playerNeedsRestart();
				logger.debug('[Config] Setting mpv to restart after next song');
			}
		}
	}

	if (newConfig.OnlineMode) publishURL();
	setConfig(newConfig);
	const conf = getConfig();
	// Toggling and updating settings
	setState({private: conf.EnginePrivateMode});

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
	if (argv.config) configFile = argv.config;
	await configureLogger(appPath, !!argv.debug);
	config = {...config, appPath: appPath};
	config = {...config, os: process.platform};

	configureLocale();
	await loadConfigFiles(appPath);
	configureHost();
	if (config.JwtSecret === 'Change me') setConfig( {JwtSecret: uuidV4() });
	if (config.appInstanceID === 'Change me') setConfig( {appInstanceID: uuidV4() });
	//Configure watcher
	const configWatcher = watch(resolve(appPath, configFile));
	configWatcher.on('change', () => {
		if (!savingSettings) {
			const oldConf = getConfig();
			logger.debug('[Config] Config file has been changed from the outside world, reloading it...');
			loadConfig(resolve(appPath, configFile)).then(() => {
				mergeConfig(oldConf, getConfig());
			}).catch(err => {
				logger.error(`[Config] Error parsing new config file : ${err}`);
				logger.warn('[Config] Config file has errors. It has been ignored');
			});
		}

	});

	return getConfig();
}

async function loadConfigFiles(appPath) {
	const overrideConfigFile = resolve(appPath, configFile);
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
	const newConfig = {...config, ...parsedContent};
	try {
		verifyConfig(newConfig);
		config = {...newConfig};
	} catch(err) {
		throw err;
	}
}

function configureLocale() {
	i18n.configure({
		directory: resolve(__dirname, '../locales'),
		defaultLocale: 'en',
		cookie: 'locale',
		register: global
	});
	const detectedLocale = osLocale.sync().substring(0, 2);
	i18n.setLocale(detectedLocale);
	config = {...config, EngineDefaultLocale: detectedLocale };
}

export async function configureBinaries(config) {
	logger.debug('[Launcher] Checking if binaries are available');
	const binaries = await checkBinaries(config);
	setConfig(binaries);
}

export function configureHost() {
	const conf = getConfig();
	let URLPort = `:${conf.appFrontendPort}`;
	config = {...config, osHost: address()};
	if (+conf.appFrontendPort === 80) URLPort = '';
	if (conf.OnlineMode) return config = {...config, osURL: `http://${config.OnlineHost}`};
	if (conf.EngineDisplayConnectionInfoHost === '') return config = {...config, osURL: `http://${address()}${URLPort}`};
	return config = {...config, osURL: `http://${conf.EngineDisplayConnectionInfoHost}${URLPort}`};
}

export async function setConfig(configPart) {
	config = {...config, ...configPart};
	updateConfig(config);
	return getConfig();
}

export async function backupConfig() {
	// Create a backup of our config file. Just in case.
	logger.debug('[Config] Making a backup of config.ini');
	return await copy(
		resolve(config.appPath, 'config.ini'),
		resolve(config.appPath, 'config.ini.backup'),
		{ overwrite: true }
	);
}

export async function updateConfig(newConfig) {
	savingSettings = true;
	const forbiddenConfigPrefix = ['opt','Admin','BinmpvPath','BinffprobePath','BinffmpegPath','Version','isTest','isDemo','appPath','os','EngineDefaultLocale'];
	const filteredConfig = {};
	Object.entries(newConfig).forEach(([k, v]) => {
		forbiddenConfigPrefix.every(prefix => !k.startsWith(prefix))
			&& (newConfig[k] !== defaults[k])
            && (filteredConfig[k] = v);
	});
	logger.debug('[Config] Settings being saved : '+JSON.stringify(filteredConfig));
	await asyncWriteFile(resolve(config.appPath, configFile), stringify(filteredConfig), 'utf-8');
	savingSettings = false;
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

export function resolvedPathMedias(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return conf.PathMedias.split('|').map(path => resolve(conf.appPath, path));
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
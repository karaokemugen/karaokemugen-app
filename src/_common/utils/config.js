/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {parse} from 'ini';
import {sync} from 'os-locale';
import i18n from 'i18n';
import {address} from 'ip';
import logger from 'winston';
require('winston-daily-rotate-file');
import {asyncExists, asyncReadFile, asyncRequired} from './files';
import {checkBinaries} from './binchecker';
import {emit} from './pubsub';


/** Object containing all config */
let config = {};

export const CONFIG_UPDATED = 'CONFIG_UPDATED';

/**
 * We return a copy of the configuration data so the original one can't be modified
 * without passing by this module's fonctions.
 */
export function getConfig() {
	return {...config};
}

/** Initializing configuration */
export async function initConfig(appPath, argv) {

	configureLogger(appPath, !!argv.debug);

	config = {...config, appPath: appPath};
	config = {...config, isTest: !!argv.isTest};
	config = {...config, os: process.platform};

	configureLocale();
	await loadConfigFiles(appPath);
	configureHost();
	await configureBinaries();

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
	const defaultConfigFile = resolve(appPath, 'config.ini.default');
	const overrideConfigFile = resolve(appPath, 'config.ini');
	const versionFile = resolve(__dirname, '../../VERSION');

	await loadConfig(defaultConfigFile);
	if (await asyncExists(overrideConfigFile)) {
		await loadConfig(overrideConfigFile);
	}
	if (await asyncExists(versionFile)) {
		await loadConfig(versionFile);
	}
}

async function loadConfig(configFile) {
	logger.debug('[Config] Reading configuration file ' + configFile);
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

async function configureBinaries() {
	logger.info('[Launcher] Checking if binaries are available');
	const binaries = await checkBinaries(config);
	config = {...config, ...binaries};
}

function configureHost() {
	if (config.EngineDisplayConnectionInfoHost === '') {
		config = {...config, osHost: address()};
	} else {
		config = {...config, osHost: config.EngineDisplayConnectionInfoHost};
	}
}

/**
 * Partially updating config : we send a signal to the other files using the configuration. so
 * they know it has changed.
 */
export function setConfig(configPart) {
	config = {...config, ...configPart};
	emit(CONFIG_UPDATED);
	return getConfig();
}

/**
 * Functions used to manipulate configuration. We can pass a optional config object.
 * In this case, the method works with the configuration passed as argument rather than the current 
 * configuration.
 */

export function resolvedPathKaras(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;

	const resolvedPaths = [];
	for (const path of conf.PathKaras.split('|')) {
		resolvedPaths.push(resolve(conf.appPath, path));
	}
	return resolvedPaths;
}

export function resolvedPathSubs(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;

	const resolvedPaths = [];
	for (const path of conf.PathSubs.split('|')) {
		resolvedPaths.push(resolve(conf.appPath, path));
	}
	return resolvedPaths;
}

export function resolvedPathVideos(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;

	const resolvedPaths = [];
	for (const path of conf.PathVideos.split('|')) {
		resolvedPaths.push(resolve(conf.appPath, path));
	}
	return resolvedPaths;
}

export function resolvedPathTemp(overrideConfig) {
	const conf = overrideConfig ? overrideConfig : config;
	return resolve(conf.appPath, conf.PathTemp);
}

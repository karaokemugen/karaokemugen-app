/** Gestion centralisée de la configuration de Karaoke Mugen. */

import {resolve} from 'path';
import {parse} from 'ini';
import {sync} from 'os-locale';
import {setLocale} from 'i18n';
import {appPath, asyncExists, asyncReadFile, asyncRequired} from './files';
import {configUpdate, emit} from './pubsub';
import logger from './logger';

const defaultConfigFile = resolve(appPath, 'config.ini.default');
const overrideConfigFile = resolve(appPath, 'config.ini');
const versionFile = resolve(appPath, 'VERSION');

/** Objet contenant l'ensemble de la configuration. */
let config = {};

/**
 * On renvoie une copie de la configuration, afin d'assurer que l'objet interne ne puisse être modifié
 * sans passer par une des fonctions de ce module.
 */
export function getConfig() {
	return {...config};
}

/** Initialisation de la configuration. */
export async function initConfig() {
	await loadConfig(defaultConfigFile);
	if (await asyncExists(overrideConfigFile)) {
		await loadConfig(overrideConfigFile);
	}
	await loadConfig(versionFile);
	config.os = process.platform;
	configureLocale();
	return getConfig();
}

async function loadConfig(configFile) {
	logger.debug('Chargement du fichier de configuration ' + configFile);
	await asyncRequired(configFile);
	const content = await asyncReadFile(configFile, 'utf-8');
	const parsedContent = parse(content);
	config = {...config, ...parsedContent};
	return getConfig();
}

function configureLocale() {
	const detectedLocale = sync().substring(0, 2);
	setLocale(detectedLocale);
	config.EngineDefaultLocale = detectedLocale;
}

/**
 * Mise à jour partielle de la configuration. On émet un message permettant aux différents fichiers consernés
 * de se remettre à jour.
 */
export function setConfig(configPart) {
	config = {...config, ...configPart};
	emit(configUpdate, config);
	return getConfig();
}


/** Fonction centralisant l'aide au parsing de la configuration. */

export function pipPositionX() {
	switch (config.PlayerPIPPositionX) {
	case 'Left':
		return 1;
	case 'Center':
		return 50;
	case 'Right':
		return 99;
	default:
		return 50;
	}
}

export function pipPositionY() {
	switch (config.PlayerPIPPositionY) {
	case 'Top':
		return 5;
	case 'Center':
		return 50;
	case 'Bottom':
		return 95;
	default:
		return 50;
	}
}

export function mpvBin() {
	switch (process.platform) {
	case 'win32':
		return resolve(appPath, config.BinPlayerWindows);
	case 'darwin':
		return resolve(appPath, config.BinPlayerOSX);
	default:
		return resolve(appPath, config.BinPlayerLinux);
	}
}

export function mpvSocket() {
	switch (process.platform) {
	case 'win32':
		return resolve(appPath, '\\\\.\\pipe\\mpvsocket');
	default:
		return resolve(appPath, '/tmp/km-node-mpvsocket');
	}
}

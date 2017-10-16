/** Gestion centralisée de la configuration de Karaoke Mugen. */

import {resolve} from 'path';
import {parse} from 'ini';
import {sync} from 'os-locale';
import i18n from 'i18n';
import logger from './logger';
import {asyncExists, asyncReadFile, asyncRequired} from './files';
import {checkBinaries} from './binchecker';
import {emit} from './pubsub';

/** Objet contenant l'ensemble de la configuration. */
let config = {};

export const CONFIG_UPDATED = 'CONFIG_UPDATED';

/**
 * On renvoie une copie de la configuration, afin d'assurer que l'objet interne ne puisse être modifié
 * sans passer par une des fonctions de ce module.
 */
export function getConfig() {
	return {...config};
}

/** Initialisation de la configuration. */
export async function initConfig(appPath) {

	config = {...config, appPath: appPath};
	config = {...config, os: process.platform};

	configureLocale();
	await loadConfigFiles(appPath);
	await configureBinaries();

	return getConfig();
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
	logger.debug('Chargement du fichier de configuration ' + configFile);
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

/**
 * Mise à jour partielle de la configuration. On émet un message permettant aux différents fichiers consernés
 * d'être notifiés que la configuration a changé.
 */
export function setConfig(configPart) {
	config = {...config, ...configPart};
	emit(CONFIG_UPDATED);
	return getConfig();
}

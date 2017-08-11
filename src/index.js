/**
 * @fileoverview Launcher source file
 */

const clc = require('cli-color');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const extend = require('extend');
const mkdirp = require('mkdirp');
const argv = require('minimist')(process.argv.slice(2));

const logger = require('./_common/utils/logger.js');
const i18n = require('i18n');
const osLocale = require('os-locale');

/**
 * Clear console - and welcome message
 * Node does not like the octal clear screen sequence.
 * So we wrote it in hexa (1B)
 */
process.stdout.write('\x1Bc');
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log(clc.greenBright('| Project Toyunda Mugen                                            |'));
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log('\n');



i18n.configure({
	directory: path.resolve(__dirname,'_common/locales'),
	defaultLocale: 'en',
	register: global
});

var detectedLocale = osLocale.sync().substring(0,2);
i18n.setLocale(detectedLocale);
logger.info('[Launcher] Locale detected : '+detectedLocale);

if (argv.help) {

	console.log(__('HELP_MSG'));
	process.exit(0);
}

if (argv.version) {
	console.log('Toyunda Mugen v2.0 - Finé Fantastique');
	console.log('Database schema version : xxx');
	process.exit(0);
}

/** Call to resolveSyspath to get the app's path in all OS configurations */
const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','../']);
if(SYSPATH) {
	logger.debug('[Launcher] SysPath detected : '+SYSPATH);
	// Lecture de la configuration par défault
	/**
	 * Reading config.ini.default, then override it with config.ini if it exists.
	 */
	var SETTINGS = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini.default'), 'utf-8'));
	if(fs.existsSync(path.join(SYSPATH,'config.ini'))) {
		// et surcharge via le contenu du fichier personnalisé si présent
		var configCustom = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini'), 'utf-8'));
		extend(true,SETTINGS,configCustom);
		logger.debug('[Launcher] Custom configuration merged.');
	}
	SETTINGS.os = process.platform;
	logger.debug('[Launcher] Detected OS : '+SETTINGS.os);
	SETTINGS.EngineDefaultLocale = detectedLocale;	

	logger.info('[Launcher] Loaded configuration file');
	logger.debug('[Launcher] Loaded configuration : '+JSON.stringify(SETTINGS,null,'\n'));

	// Vérification que les chemins sont bien présents, sinon les créer
	/**
	 * Checking if application paths exist.
	 * The app needs :
	 * app/bin
	 * app/data
	 * app/db
	 * app/temp
	 */
	var ret;
	logger.info('[Launcher] Checking data folders');
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathKaras))) {
		logger.warn('[Launcher] Creating folder '+path.join(SYSPATH,SETTINGS.PathKaras));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathKaras));
		if (!ret) {
			logger.error('[Launcher] Failed to create folder');
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathSubs))) {
		logger.warn('[Launcher] Creating folder '+path.join(SYSPATH,SETTINGS.PathSubs));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathSubs));
		if (!ret) {
			logger.error('[Launcher] Failed to create folder');
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathVideos))) {
		logger.warn('[Launcher] Creating folder '+path.join(SYSPATH,SETTINGS.PathVideos));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathVideos));
		if (!ret) {
			logger.error('[Launcher] Failed to create folder');
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathDB))) {
		logger.warn('[Launcher] Creating folder '+path.join(SYSPATH,SETTINGS.PathDB));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathDB));
		if (!ret) {
			logger.error('[Launcher] Failed to create folder');
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathTemp))) {
		logger.warn('[Launcher] Creating folder '+path.join(SYSPATH,SETTINGS.PathTemp));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathTemp));
		if (!ret) {
			logger.error('[Launcher] Failed to create folder');
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathBin))) {
		logger.warn('[Launcher] Creating folder '+path.join(SYSPATH,SETTINGS.PathBin));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathBin));
		if (!ret) {
			logger.error('[Launcher] Failed to create folder');
			process.exit();
		}
	}

	/**
	 * Calling engine.
	 */
	var engine = require('./_engine/index.js');
	engine.SYSPATH = SYSPATH;
	engine.SETTINGS = SETTINGS;

	if(argv.testplaylist)
		engine.test_playlist_controller();
	else
		engine.run();
} else {
	logger.error('[Launcher] Unable to detect SysPath !');
	process.exit(1);
}
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
console.log("\n");

var detectedLocale = osLocale.sync().substring(0,2);	


i18n.configure({    
    directory: path.resolve(__dirname,'_common/locales'),
	defaultLocale: 'en',
	register: global
});
i18n.setLocale(detectedLocale);

logger.info(__('LOCALE_DETECTED')+detectedLocale);


if (argv.help) { 
	
	console.log(__('HELP_MSG'));
	process.exit(0);
}

if (argv.version) {
	console.log("Toyunda Mugen v2.0 - Finé Fantastique");
	console.log("Database version : xxx")
	process.exit(0);
}

/** Call to resolveSyspath to get the app's path in all OS configurations */
const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','../']);
if(SYSPATH)
{
	logger.debug(__('SYSPATH_DETECTED')+SYSPATH);
	// Lecture de la configuration par défault
	/**
	 * Reading config.ini.default, then override it with config.ini if it exists.
	 */
	var SETTINGS = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini.default'), 'utf-8'));
	if(fs.existsSync(path.join(SYSPATH,'config.ini')))
	{
		// et surcharge via le contenu du fichier personnalisé si présent
		var configCustom = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini'), 'utf-8'))
		extend(true,SETTINGS,configCustom);
	}
	SETTINGS.os = process.platform;
	SETTINGS.EngineDefaultLocale = detectedLocale;

	logger.info(__('CONFIG_LOADING'));
	logger.debug(__('CONFIG_LOADED')+JSON.stringify(SETTINGS,null,'\n'));

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
	logger.info(__('DATAFOLDERS_CHECK'));
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathKaras))) {
		logger.warn(__('CREATING_FOLDER',path.join(SYSPATH,SETTINGS.PathKaras)));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathKaras));
		if (!ret) {
			logger.error(__('CREATING_FOLDER_FAILED'));
			process.exit();
		}
	}	
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathSubs))) {
		logger.warn(__('CREATING_FOLDER',path.join(SYSPATH,SETTINGS.PathSubs)));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathSubs));
		if (!ret) {
			logger.error(__('CREATING_FOLDER_FAILED'));
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathVideos))) {
		logger.warn(__('CREATING_FOLDER',path.join(SYSPATH,SETTINGS.PathVideos)));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathVideos));
		if (!ret) {
			logger.error(__('CREATING_FOLDER_FAILED'))
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathDB))) {
		logger.warn(__('CREATING_FOLDER',path.join(SYSPATH,SETTINGS.PathDB)));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathDB));
		if (!ret) {
			logger.error(__('CREATING_FOLDER_FAILED'));
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathTemp))) {
		logger.warn(__('CREATING_FOLDER',path.join(SYSPATH,SETTINGS.PathTemp)));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathTemp));
		if (!ret) {
			logger.error(__('CREATING_FOLDER_FAILED'));
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.PathBin))) {
		logger.warn(__('CREATING_FOLDER',path.join(SYSPATH,SETTINGS.PathBin)));
		ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.PathBin));
		if (!ret) {
			logger.error(__('CREATING_FOLDER_FAILED'));
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
}
else
{
	logger.error('DETECTED_SYSPATH_FAILED');
}
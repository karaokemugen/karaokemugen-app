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

/**
 * Clear console - and welcome message
 * Node does not like the octal clear screen sequence.
 * So we wrote it in hexa (1B)
 */ 
process.stdout.write('\x1Bc');
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log(clc.greenBright('| Project Toyunda Mugen - v2.0 Finé Fantastique                    |'));
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log("\n");

if (argv.help) { 
	var help = "Usage : \n";
	help += "\n";
	help += "toyundamugen [--help] [--version] [--debug] [--testplaylist]\n";
	help += "\n";
	help += "	Options : \n";
	help += "\n";
	help += "		--help     Prints this help message\n";
	help += "		--version  Prints version information\n";
	help += "		--debug    Displays debug messages\n";
	help += "		--testplaylist    Launch a playlist controller test procedure\n";
	help += "\n";

	console.log(help);
	process.exit(0);
}

if (argv.version) {
	console.log("Toyunda Mugen v2.0 - Finé Fantastique");
	process.exit(0);
}

/** Call to resolveSyspath to get the app's path in all OS configurations */
const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','../']);
if(SYSPATH)
{
	logger.debug('Detected SysPath is :'+SYSPATH);
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
	SETTINGS.os = 'Windows';

	logger.info('Loading configuration.');
	logger.log('debug','Configuration loaded : '+JSON.stringify(SETTINGS,null,'\n'));

	// Vérification que les chemins sont bien présents, sinon les créer
	/**
	 * Checking if application paths exist.
	 * The app needs :
	 * app/bin
	 * app/data
	 * app/db
	 * app/temp
	 */
	logger.info('Checking if data folders are in place');
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Karas))) {
		logger.info(path.join(SYSPATH,SETTINGS.Path.Karas)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.Karas));
		if (!ret) {
			logger.error('Unable to create '+path.join(SYSPATH,SETTINGS.Path.Karas)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Subs))) {
		logger.notice(path.join(SYSPATH,SETTINGS.Path.Subs)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.Subs));
		if (!ret) {
			logger.error('Unable to create '+path.join(SYSPATH,SETTINGS.Path.Subs)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Videos))) {
		logger.notice(path.join(SYSPATH,SETTINGS.Path.Videos)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.Videos));
		if (!ret) {
			logger.error('Unable to create '+path.join(SYSPATH,SETTINGS.Path.Videos)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.DB))) {
		logger.notice(path.join(SYSPATH,SETTINGS.Path.DB)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.DB));
		if (!ret) {
			logger.error('Unable to create '+path.join(SYSPATH,SETTINGS.Path.DB)+'... Exiting.')
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
	logger.error('Cannot resolve syspath - Exiting...');
}
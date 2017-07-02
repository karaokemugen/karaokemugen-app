const clc = require('cli-color');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const extend = require('extend');
const mkdirp = require('mkdirp');
const logger = require('./_common/utils/logger.js');
logger.SOURCE = 'index.js';
// Clear console - and welcome message
process.stdout.write('\033c');
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log(clc.greenBright('| Project Toyunda ^^ Enjoy                                         |'));
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log("\n");

const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','../']);
if(SYSPATH)
{
	logger.notice('Detected SysPath is :'+clc.greenBright(SYSPATH));
	// Lecture de la configuration par défault
	var SETTINGS = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini.default'), 'utf-8'));
	if(fs.existsSync(path.join(SYSPATH,'config.ini')))
	{
		// et surcharge via le contenu du fichier personnalisé si présent
		var configCustom = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini'), 'utf-8'))
		extend(true,SETTINGS,configCustom);
	}
	SETTINGS.os = 'Windows';

	logger.notice('Loading configuration.');
	//console.log(SETTINGS);

	// Vérification que les chemins sont bien présents, sinon les créer
	logger.notice('Checking if data folders are in place...');
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Karas))) {
		logger.notice(path.join(SYSPATH,SETTINGS.Path.Karas)+' does not exist, creating it...');
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

	var engine = require('./_engine/index.js');
	engine.SYSPATH = SYSPATH;
	engine.SETTINGS = SETTINGS;
	engine.run();
}
else
{
	console.log(clc.redBright('ERROR - Cannot resolve syspath - Exiting...'));
	console.log("\n");
}
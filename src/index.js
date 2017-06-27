const clc = require('cli-color');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const extend = require('extend');
const mkdirp = require('mkdirp');

// Clear console - and welcome message
process.stdout.write('\033c');
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log(clc.greenBright('| Project Toyunda ^^ Enjoy                                         |'));
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log("\n");

const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','../']);
if(SYSPATH)
{
	console.log('Detected SysPath is :'+clc.greenBright(SYSPATH));
	console.log("\n");

	// Lecture de la configuration par défault
	var SETTINGS = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini.default'), 'utf-8'));
	if(fs.existsSync(path.join(SYSPATH,'config.ini')))
	{
		// et surcharge via le contenu du fichier personnalisé si présent
		var configCustom = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini'), 'utf-8'))
		extend(true,SETTINGS,configCustom);
	}
	SETTINGS.os = 'Windows';

	console.log('Loading configuration :');
	//console.log(SETTINGS);
	console.log("\n");

	// Vérification que les chemins sont bien présents, sinon les créer
	console.log('Checking if data folders are in place...');
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Karas))) {
		console.log(path.join(SYSPATH,SETTINGS.Path.Karas)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.Karas));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,SETTINGS.Path.Karas)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Subs))) {
		console.log(path.join(SYSPATH,SETTINGS.Path.Subs)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.Subs));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,SETTINGS.Path.Subs)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.Videos))) {
		console.log(path.join(SYSPATH,SETTINGS.Path.Videos)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.Videos));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,SETTINGS.Path.Videos)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,SETTINGS.Path.DB))) {
		console.log(path.join(SYSPATH,SETTINGS.Path.DB)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,SETTINGS.Path.DB));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,SETTINGS.Path.DB)+'... Exiting.')
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
	console.log(clc.redBright('Cannot resolve syspath - Exit'));
	console.log("\n");
}
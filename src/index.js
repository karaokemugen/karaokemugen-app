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

const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','./src']);
if(SYSPATH)
{
	console.log('Detected SysPath is :'+clc.greenBright(SYSPATH));
	console.log("\n");

	// Lecture de la configuration par défault
	var config = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini.default'), 'utf-8'));
	if(fs.existsSync(path.join(SYSPATH,'config.ini')))
	{
		// et surcharge via le contenu du fichier personnalisé si présent
		var configCustom = ini.parse(fs.readFileSync(path.join(SYSPATH,'config.ini'), 'utf-8'))
		extend(true,config,configCustom);
	}
	console.log('Loading configuration :');
	console.log(config);
	console.log("\n");

	// Vérification que les chemins sont bien présents, sinon les créer
	console.log('Checking if data folders are in place...');
	if(!fs.existsSync(path.join(SYSPATH,config.Path.Karas))) {
		console.log(path.join(SYSPATH,config.Path.Karas)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,config.Path.Karas));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,config.Path.Karas)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,config.Path.Subs))) {
		console.log(path.join(SYSPATH,config.Path.Subs)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,config.Path.Subs));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,config.Path.Subs)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,config.Path.Videos))) {
		console.log(path.join(SYSPATH,config.Path.Videos)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,config.Path.Videos));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,config.Path.Videos)+'... Exiting.')
			process.exit();
		}
	}
	if(!fs.existsSync(path.join(SYSPATH,config.Path.DB))) {
		console.log(path.join(SYSPATH,config.Path.DB)+' does not exist, creating it...');
		var ret = mkdirp.sync(path.join(SYSPATH,config.Path.DB));
		if (!ret) {
			console.log('Unable to create '+path.join(SYSPATH,config.Path.DB)+'... Exiting.')
			process.exit();
		}
	}

	var engine = require('./_engine/index.js');
	engine.SYSPATH = SYSPATH;
	engine.run();
}
else
{
	console.log(clc.redBright('Cannot resolve syspath - Exit'));
	console.log("\n");
}
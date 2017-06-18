const clc = require('cli-color');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const extend = require('extend');

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
	console.log(config);
	console.log("\n");

	var engine = require('./_engine/index.js');
	engine.SYSPATH = SYSPATH;
	engine.run();
}
else
{
	console.log(clc.redBright('Cannot resolve syspath - Exit'));
	console.log("\n");
}
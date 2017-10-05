/**
 * @fileoverview Launcher source file
 */

const clc = require('cli-color');
const fs = require('fs-extra');
const path = require('path');
const ini = require('ini');
const extend = require('extend');
const argv = require('minimist')(process.argv.slice(2));

const i18n = require('i18n');
const osLocale = require('os-locale');

const net = require('net');

process.on('uncaughtException', function (exception) {
	console.log(exception); // to see your exception details in the console
	// if you are on production, maybe you can send the exception details to your
	// email as well ?
});

/**
 * Clear console - and welcome message
 * Node does not like the octal clear screen sequence.
 * So we wrote it in hexa (1B)
 */
process.stdout.write('\x1Bc');
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log(clc.greenBright('| Project Karaoke Mugen                                            |'));
console.log(clc.greenBright('+------------------------------------------------------------------+'));
console.log('\n');



i18n.configure({
	directory: path.resolve(__dirname,'_common/locales'),
	defaultLocale: 'en',
	cookie: 'locale',
	register: global
});

if (argv.help) {

	console.log(__('HELP_MSG'));
	process.exit(0);
}

/** Call to resolveSyspath to get the app's path in all OS configurations */
const logger = require('./_common/utils/logger.js');		
const SYSPATH = require('./_common/utils/resolveSyspath.js')('config.ini.default',__dirname,['./','../']);
if(SYSPATH) {	
	logger.debug('[Launcher] SysPath detected : '+SYSPATH);
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
	var version = ini.parse(fs.readFileSync(path.resolve(__dirname,'VERSION'), 'utf-8'));
	extend(true,SETTINGS,version);

	var detectedLocale = osLocale.sync().substring(0,2);
	i18n.setLocale(detectedLocale);
	SETTINGS.os = process.platform;
	SETTINGS.EngineDefaultLocale = detectedLocale;

	if (argv.version) {
		console.log('Karaoke Mugen '+SETTINGS.VersionNo+' - '+SETTINGS.VersionName);
		process.exit(0);
	}
	
	logger.info('[Launcher] Locale detected : '+detectedLocale);
	logger.debug('[Launcher] Detected OS : '+SETTINGS.os);

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
	var PathsToCheck = [];
	var PathsKaras = SETTINGS.PathKaras.split('|');
	PathsKaras.forEach(function(PathKaras){
		PathsToCheck.push(PathKaras);		
	});
	var PathsSubs = SETTINGS.PathSubs.split('|');
	PathsSubs.forEach(function(PathSubs){
		PathsToCheck.push(PathSubs);		
	});
	var PathsVideos = SETTINGS.PathVideos.split('|');
	PathsVideos.forEach(function(PathVideos){
		PathsToCheck.push(PathVideos);		
	});
	var PathsJingles = SETTINGS.PathJingles.split('|');
	PathsJingles.forEach(function(PathJingles){
		PathsToCheck.push(PathJingles);		
	});
	PathsToCheck.push(SETTINGS.PathDB);
	PathsToCheck.push(SETTINGS.PathTemp);
	PathsToCheck.push(SETTINGS.PathBin);
	
	PathsToCheck.forEach((Path) => {
		if(!fs.existsSync(path.resolve(SYSPATH,Path))) {
			logger.warn('[Launcher] Creating folder '+path.resolve(SYSPATH,Path));
			ret = fs.mkdirsSync(path.resolve(SYSPATH,Path));
			if (!ret) {
				logger.error('[Launcher] Failed to create folder');
				process.exit();
			}
		}
	});
	

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	logger.debug('[Launcher] Copying input.conf into '+path.resolve(SYSPATH,SETTINGS.PathTemp));
	fs.copySync(path.join(__dirname,'/_player/assets/input.conf'),path.resolve(SYSPATH,SETTINGS.PathTemp,'input.conf'),{ overwrite: true });

	/**
	 * Test if network ports are available
	 */

	var ports = [1337,1338,1339,1340];
	ports.forEach(function(port){
		var server = net.createServer();
		server.once('error', function(err) {
			if (err.code === 'EADDRINUSE') {
				logger.error('[Launcher] Port '+port+' is already in use.');
				logger.error('[Launcher] If another Karaoke Mugen instance is running, please kill it (process name is "node")');
				logger.error('[Launcher] Then restart the app.');
				process.exit(1);
			}
		});

		server.once('listening', function() {
			// close the server if listening doesn't fail
			server.close();
		});
		server.listen(port);
	});

	/**
	 * Test if binaries are available
	 */
	logger.info('[Launcher] Checking if binaries are available');
	var binaries = require('./_common/utils/binchecker.js');
	binaries.SYSPATH = SYSPATH;
	binaries.SETTINGS = SETTINGS;
	binaries.check();
	SETTINGS.BinffmpegPath = binaries.ffmpegPath;
	SETTINGS.BinffprobePath = binaries.ffprobePath;
	SETTINGS.BinmpvPath = binaries.mpvPath;

	/**
	 * Check if backup folder for karaokes exists. If it does, it means previous generation aborted
	 */
	const karas_dbfile = path.resolve(SYSPATH,SETTINGS.PathDB, SETTINGS.PathDBKarasFile);	
		
	//Restoring kara folder
	PathsKaras.forEach((PathKara) => {
		var karasdir = path.resolve(SYSPATH,PathKara);
		if (fs.existsSync(karasdir+'_backup')) {
			logger.info('[Launcher] Mahoro Mode : Backup folder '+karasdir+'_backup exists, replacing karaokes folder with it.');
			fs.removeSync(karasdir);
			fs.renameSync(karasdir+'_backup',karasdir);
			if (fs.existsSync(karas_dbfile)) {
				logger.info('[Launcher] Mahoro Mode : clearing karas database : generation will occur shortly');
				fs.unlinkSync(karas_dbfile);
			}
		}
	});
	

	if(argv.test) {
		SETTINGS.isTest = true;
	} else {
		SETTINGS.isTest = false;
	}
	/**
	 * Calling engine.
	 */
	var engine = require('./_engine/index.js');
	engine.SYSPATH = SYSPATH;
	engine.SETTINGS = SETTINGS;
	engine.i18n = i18n;
	engine.run();


} else {
	logger.error('[Launcher] Unable to detect SysPath !');
	process.exit(1);
}
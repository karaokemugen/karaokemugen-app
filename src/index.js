/**
 * @fileoverview Launcher source file
 */
import {asyncCheckOrMkdir, asyncExists, asyncRemove, asyncRename, asyncUnlink} from './_common/utils/files';
import {setConfig,initConfig,configureBinaries} from './_common/utils/config';
import {copy} from 'fs-extra';
import path from 'path';
import minimist from 'minimist';

import i18n from 'i18n';

import net from 'net';
import logger from 'winston';

import {initEngine} from './_services/engine';
import resolveSysPath from './_common/utils/resolveSyspath';
import {karaGenerationBatch} from './_admin/generate_karasfiles';
import {startExpressReactServer} from './_webapp/react';

import {openDatabases} from './_dao/database';

process.on('uncaughtException', function (exception) {
	console.log(exception); // to see your exception details in the console
	// if you are on production, maybe you can send the exception details to your
	// email as well ?
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	// application specific logging, throwing an error, or other logic here
});


/**
 * Clear console - and welcome message
 * Node does not like the octal clear screen sequence.
 * So we wrote it in hexa (1B)
 */
process.stdout.write('\x1Bc');
const argv = parseArgs();
const appPath = resolveSysPath('config.ini.default',__dirname,['./','../']);
if(appPath) {
	main()
		.then(() => logger.info('[Launcher] Async launch done'))
		.catch(err => {
			logger.error('[Launcher] Error during async launch : ' + err);
			process.exit(1);
		});
} else {
	logger.error('[Launcher] Unable to detect SysPath !');
	process.exit(1);
}

async function main() {

	/** Note : pas de logging avant l'initialisation de la configuration, qui inclut le logger. */

	let config = await initConfig(appPath, argv);
	console.log('--------------------------------------------------------------------');
	console.log('Karaoke Mugen '+config.VersionNo+' '+config.VersionName);
	console.log('--------------------------------------------------------------------');
	console.log('\n');

	logger.debug('[Launcher] SysPath detected : ' + appPath);
	logger.info('[Launcher] Locale detected : ' + config.EngineDefaultLocale);
	logger.debug('[Launcher] Detected OS : ' + config.os);

	if (argv.help) {
		console.log(i18n.__('HELP_MSG'));
		process.exit(0);
	}
	if (argv.version) {
		console.log('Karaoke Mugen '+ config.VersionNo + ' - (' + config.VersionName+')');
		process.exit(0);
	}
	if (argv.generate) {
		logger.info('[Launcher] Database generation requested');
		setConfig({optGenerateDB: true});
	}
	logger.info('[Launcher] Loaded configuration file');
	logger.debug('[Launcher] Loaded configuration : ' + JSON.stringify(config, null, '\n'));

	// Checking binaries
	await configureBinaries(config);

	// Vérification de l'existence des répertoires, sinon les créer.
	await checkPaths(config);

	if (argv.karagen) {
		logger.info('[Launcher] .kara generation requested');
		await karaGenerationBatch();
		process.exit(0);
	}

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	logger.debug('[Launcher] Copying input.conf into ' + path.resolve(appPath, config.PathTemp));
	await copy(
		path.join(__dirname, '/_player/assets/input.conf'),
		path.resolve(appPath, config.PathTemp, 'input.conf'),
		{ overwrite: true }
	);

	/**
	 * Test if network ports are available
	 */
	[1337, 1338, 1339, 1340].forEach(port => verifyOpenPort(port));

	await restoreKaraBackupFolders(config);
	await openDatabases(config);

	/** Start React static frontend */
	startExpressReactServer(1338);

	/**
	 * Calling engine.
	 */		
	initEngine();
}

/**
 * Fonction de contournement du bug https://github.com/babel/babel/issues/5542
 * A supprimer une fois que celui-ci sera résolu.
 */
function parseArgs() {
	if (process.argv.indexOf('--') >= 0) {
		return minimist(process.argv.slice(3));
	} else {
		return minimist(process.argv.slice(2));
	}
}

/**
 * Checking if application paths exist.
 * The app needs :
 * app/bin
 * app/data
 * app/db
 * app/temp
 */
async function checkPaths(config) {

	const appPath = config.appPath;

	let checks = [];
	config.PathKaras.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathSubs.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathVideos.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathJingles.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathBackgrounds.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	checks.push(asyncCheckOrMkdir(appPath, config.PathDB));
	checks.push(asyncCheckOrMkdir(appPath, config.PathBin));
	checks.push(asyncCheckOrMkdir(appPath, config.PathTemp));
	checks.push(asyncCheckOrMkdir(appPath, config.PathPreviews));
	checks.push(asyncCheckOrMkdir(appPath, config.PathImport));
	checks.push(asyncCheckOrMkdir(appPath, config.PathAvatars));

	await Promise.all(checks);
	logger.info('[Launcher] Directory checks complete');
}

function verifyOpenPort(port) {
	const server = net.createServer();
	server.once('error', err => {
		if (err.code === 'EADDRINUSE') {
			logger.error('[Launcher] Port '+port+' is already in use.');
			logger.error('[Launcher] If another Karaoke Mugen instance is running, please kill it (process name is "node")');
			logger.error('[Launcher] Then restart the app.');
			process.exit(1);
		}
	});
	server.once('listening', () => server.close());
	server.listen(port);
}

/**
 * Check if backup folder for karaokes exists. If it does, it means previous generation aborted.
 * Backup folder is restored.
 */
async function restoreKaraBackupFolders(config) {
	const restores = [];
	config.PathKaras.split('|').forEach(pathKara => restores.push(restoreBackupFolder(pathKara, config)));
	await Promise.all(restores);
}

async function restoreBackupFolder(pathKara, config) {
	const karasDbFile = path.resolve(appPath, config.PathDB, config.PathDBKarasFile);
	const karasDir = path.resolve(appPath, pathKara);
	const karasDirBackup = karasDir+'_backup';
	if (await asyncExists(karasDirBackup)) {
		logger.info('[Launcher] Mahoro Mode : Backup folder ' + karasDirBackup + ' exists, replacing karaokes folder with it.');
		await asyncRemove(karasDir);
		await asyncRename(karasDirBackup, karasDir);
		if (await asyncExists(karasDbFile)) {
			logger.info('[Launcher] Mahoro Mode : clearing karas database : generation will occur shortly');
			await asyncUnlink(karasDbFile);
		}
	}
}
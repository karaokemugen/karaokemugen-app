/**
 * @fileoverview Launcher source file
 */
import {asyncCheckOrMkdir, asyncExists, asyncRemove, asyncRename, asyncUnlink} from './_common/utils/files';
import {setConfig,initConfig,configureBinaries} from './_common/utils/config';
import {copy} from 'fs-extra';
import {join, resolve} from 'path';
import minimist from 'minimist';
import i18n from 'i18n';
import net from 'net';
import logger from 'winston';
import {exit, initEngine} from './_services/engine';
import resolveSysPath from './_common/utils/resolveSyspath';
import {karaGenerationBatch} from './_admin/generate_karasfiles';
import {startExpressReactServer} from './_webapp/react';
import {openDatabases} from './_dao/database';


process.on('uncaughtException', function (exception) {
	console.log(exception); 
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);	
});

const argv = parseArgs();
const appPath = resolveSysPath('config.ini.default',__dirname,['./','../']);
if (appPath) {
	main()
		.catch(err => {
			logger.error(`[Launcher] Error during async launch : ${err}`);
			exit(1);
		});
} else {
	logger.error('[Launcher] Unable to detect SysPath !');
	exit(1);
}

async function main() {

	let config = await initConfig(appPath, argv);
	console.log('--------------------------------------------------------------------');
	console.log(`Karaoke Mugen ${config.VersionNo} (${config.VersionName})`);
	console.log('--------------------------------------------------------------------');
	console.log('\n');

	logger.debug(`[Launcher] SysPath detected : ${appPath}`);
	logger.debug(`[Launcher] Locale detected : ${config.EngineDefaultLocale}`);
	logger.debug(`[Launcher] Detected OS : ${config.os}`);

	if (argv.help) {
		console.log(i18n.__('HELP_MSG'));
		process.exit(0);
	}
	if (argv.version) {
		console.log('Karaoke Mugen '+ config.VersionNo + ' - (' + config.VersionName+')');
		process.exit(0);
	}
	if (argv.generate && !argv.validate) {
		logger.info('[Launcher] Database generation requested');
		setConfig({optGenerateDB: true});
	}
	if (argv.validate && !argv.generate) {
		logger.info('[Launcher] .kara folder validation requested');
		setConfig({optValidateKaras: true});
	}
	if (argv.validate && argv.generate) {
		console.log('Error : --validate and --generate are mutually exclusive!');
		process.exit(1);
	}
	if (argv.updateBase) {
		logger.info('[Launcher] Base update requested');
		setConfig({optBaseUpdate: true});
		setConfig({optGenerateDB: true});
	}
	if (argv.test) {
		logger.info('[Launcher] KARAOKE MUGEN RUNNING IN TEST MODE. DO NOT USE IT IN PRODUCTION');
		setConfig({isTest: true});
	}
	logger.debug('[Launcher] Loaded configuration : ' + JSON.stringify(config, null, '\n'));

	// Checking binaries
	await configureBinaries(config);

	// Checking paths, create them if needed.
	await checkPaths(config);

	if (argv.karagen) {
		logger.info('[Launcher] .kara generation requested');
		await karaGenerationBatch();
		process.exit(0);
	}

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	logger.debug('[Launcher] Copying input.conf to ' + resolve(appPath, config.PathTemp));
	await copy(
		join(__dirname, '/_player/assets/input.conf'),
		resolve(appPath, config.PathTemp, 'input.conf'),
		{ overwrite: true }
	);
	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug('[Launcher] Copying blank.png to ' + resolve(appPath, config.PathAvatars));
	if (!await asyncExists(resolve(appPath, config.PathAvatars, 'blank.png'))) {
		await copy(
			join(__dirname, '/_webapp/ressources/img/blank.png'),
			resolve(appPath, config.PathAvatars, 'blank.png')
		);
	}
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
 * Workaround for bug https://github.com/babel/babel/issues/5542
 * Delete this once the bug is resolved.
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
	logger.debug('[Launcher] Directory checks complete');
}

function verifyOpenPort(port) {
	const server = net.createServer();
	server.once('error', err => {
		if (err.code === 'EADDRINUSE') {
			logger.error(`[Launcher] Port ${port} is already in use.`);
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
	const karasDbFile = resolve(appPath, config.PathDB, config.PathDBKarasFile);
	const karasDir = resolve(appPath, pathKara);
	const karasDirBackup = karasDir+'_backup';
	if (await asyncExists(karasDirBackup)) {
		logger.info(`[Launcher] Backup folder ${karasDirBackup} exists, replacing karaokes folder with it.`);
		await asyncRemove(karasDir);
		await asyncRename(karasDirBackup, karasDir);
		if (await asyncExists(karasDbFile)) {
			logger.info('[Launcher] Clearing karas database : generation will occur shortly');
			await asyncUnlink(karasDbFile);
		}
	}
}
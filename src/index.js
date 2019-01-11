import {asyncCheckOrMkdir, asyncReadDir, asyncExists, asyncRemove, asyncUnlink} from './_utils/files';
import {getConfig, initConfig, configureBinaries} from './_utils/config';
import {parseCommandLineArgs} from './args.js';
import {writeFileSync, readFileSync} from 'fs';
import {copy} from 'fs-extra';
import {join, resolve} from 'path';
import {createServer} from 'net';
import logger from 'winston';
import minimist from 'minimist';
import {exit, initEngine} from './_services/engine';
import {logo} from './logo';
import chalk from 'chalk';
import {createInterface} from 'readline';
import PrettyError from 'pretty-error';

const pe = new PrettyError();

process.on('uncaughtException', function (exception) {
	console.log(pe.render(exception));
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at:', p);
});

process.on('SIGINT', () => {
	exit('SIGINT');
});

// CTRL+C for Windows :

if (process.platform === 'win32' ) {
	const rl = createInterface({
	  input: process.stdin,
	  output: process.stdout
	});

	rl.on('SIGINT', () => {
	  exit('SIGINT');
	});
}

// Main app begins here.

let appPath;
process.pkg ? appPath = join(process.execPath,'../') : appPath = join(__dirname,'../');

process.env['NODE_ENV'] = 'production'; // Default

main()
	.catch(err => {
		logger.error(`[Launcher] Error during launch : ${err}`);
		exit(1);
	});

async function main() {
	const argv = parseArgs();
	let config = await initConfig(appPath, argv);
	console.log(chalk.blue(logo));
	console.log('Karaoke Player & Manager - http://karaokes.moe');
	console.log(`Version ${chalk.bold.green(config.VersionNo)} (${chalk.bold.green(config.VersionName)})`);
	console.log('================================================================');
	await parseCommandLineArgs(argv);
	config = getConfig();
	logger.debug(`[Launcher] SysPath : ${appPath}`);
	logger.debug(`[Launcher] Locale : ${config.EngineDefaultLocale}`);
	logger.debug(`[Launcher] OS : ${config.os}`);
	logger.debug('[Launcher] Loaded configuration : ' + JSON.stringify(config, null, '\n'));

	// Checking binaries
	await configureBinaries(config);

	// Checking paths, create them if needed.
	await checkPaths(config);

	// Copying files from the app's sources to the app's working folder.
	// This is an ugly hack : we could use fs.copy but due to a bug in pkg,
	// using a writeFile/readFile combination is making it work with recent versions
	// of pkg, thus allowing us to build for Node 10
	// See https://github.com/zeit/pkg/issues/420

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	logger.debug('[Launcher] Copying input.conf to ' + resolve(appPath, config.PathTemp));
	let fileBuffer = readFileSync(join(__dirname, '/_player/assets/input.conf'));
	const tempInput = resolve(appPath, config.PathTemp, 'input.conf');
	if (await asyncExists(tempInput)) await asyncUnlink(tempInput);
	writeFileSync(tempInput, fileBuffer);

	logger.debug('[Launcher] Copying default background to ' + resolve(appPath, config.PathTemp));
	fileBuffer = readFileSync(join(__dirname, `/_player/assets/${config.VersionImage}`));
	const tempBackground = resolve(appPath, config.PathTemp, 'default.jpg');
	if (await asyncExists(tempBackground)) await asyncUnlink(tempBackground);
	writeFileSync(tempBackground, fileBuffer);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug('[Launcher] Copying blank.png to ' + resolve(appPath, config.PathAvatars));
	fileBuffer = readFileSync(join(__dirname, '/_webapp/ressources/img/blank.png'));
	const tempAvatar = resolve(appPath, config.PathAvatars, 'blank.png');
	if (await asyncExists(tempAvatar)) await asyncUnlink(tempAvatar);
	writeFileSync(tempAvatar, fileBuffer);

	/**
	 * Test if network ports are available
	 */
	verifyOpenPort(config.appFrontendPort);

	/**
	 * Gentlemen, start your engines.
	 */
	initEngine();
}

/**
 * Checking if application paths exist.
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

	// If no karaoke is found, copy the samples directory if it exists
	try {
		await asyncReadDir(resolve(appPath, 'app/data'));
		// Check inside karas folder too.
		const karas = await asyncReadDir(resolve(appPath, 'app/data/karas'));
		if (karas.length === 0) throw 'No kara files';
	} catch(err) {
		try {
			await asyncReadDir(resolve(appPath, 'samples'));
			logger.debug('[Launcher] Kara files are missing - copying samples');
			await copy(
				resolve(appPath, 'samples'),
				resolve(appPath, 'app/data')
			);
		} catch(err) {
			logger.warn('[Launcher] No samples directory found, will not copy them.');
		}
	}

	if (await asyncExists(resolve(appPath, config.PathTemp))) await asyncRemove(resolve(appPath, config.PathTemp));
	let checks = [];
	config.PathKaras.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathSeries.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathSubs.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.PathMedias.split('|').forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
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
	const server = createServer();
	server.once('error', err => {
		if (err.code === 'EADDRINUSE') {
			logger.error(`[Launcher] Port ${port} is already in use.`);
			logger.error('[Launcher] If another Karaoke Mugen instance is running, please kill it (process name is "node" or "KaraokeMugen")');
			logger.error('[Launcher] Then restart the app.');
			process.exit(1);
		}
	});
	server.once('listening', () => server.close());
	server.listen(port);
}

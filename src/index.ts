import {asyncCheckOrMkdir, asyncReadDir, asyncExists, asyncRemove, asyncUnlink} from './_utils/files';
import {Config, getConfig, initConfig, configureBinaries} from './_utils/config';
import {parseCommandLineArgs} from './args';
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
import { setState, getState } from './_utils/state';

process.on('uncaughtException', exception => {
	console.log('Uncaught exception:', exception);
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at:', p, reason);
});

process.on('SIGINT', () => {
	exit('SIGINT');
});

process.on('SIGTERM', () => {
	exit('SIGTERM');
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

let appPath: string;
// Testing if we're in a packaged version of KM or not.
('pkg' in process) ? appPath = join(process['execPath'],'../') : appPath = join(__dirname,'../');
setState({appPath: appPath});

process.env['NODE_ENV'] = 'production'; // Default

main()
	.catch(err => {
		logger.error(`[Launcher] Error during launch : ${err}`);
		console.log(err);
		exit(1);
	});

async function main() {
	const argv = parseArgs();
	setState({os: process.platform});
	await initConfig(argv);
	const state = getState();
	console.log(chalk.blue(logo));
	console.log('Karaoke Player & Manager - http://karaokes.moe');
	console.log(`Version ${chalk.bold.green(state.version.number)} (${chalk.bold.green(state.version.name)})`);
	console.log('================================================================');
	await parseCommandLineArgs(argv);
	let config = getConfig();
	logger.debug(`[Launcher] SysPath : ${appPath}`);
	logger.debug(`[Launcher] Locale : ${state.EngineDefaultLocale}`);
	logger.debug(`[Launcher] OS : ${state.os}`);
	logger.debug(`[Launcher] Loaded configuration : ${JSON.stringify(config, null, 2)}`);
	logger.debug(`[Launcher] Initial state : ${JSON.stringify(state, null, 2)}`);

	// Checking binaries paths.
	await configureBinaries(config);

	// Checking paths, create them if needed.
	await checkPaths(config);

	// Copying files from the app's sources to the app's working folder.
	// This is an ugly hack : we could use fs.copy but due to a bug in pkg,
	// using a writeFile/readFile combination is making it work with recent versions
	// of pkg, thus allowing us to build for Node 10
	// See https://github.com/zeit/pkg/issues/420

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	logger.debug('[Launcher] Copying input.conf to ' + resolve(appPath, config.System.Path.Temp));
	let fileBuffer = readFileSync(join(__dirname, '/_player/assets/input.conf'));
	const tempInput = resolve(appPath, config.System.Path.Temp, 'input.conf');
	if (await asyncExists(tempInput)) await asyncUnlink(tempInput);
	writeFileSync(tempInput, fileBuffer);

	logger.debug('[Launcher] Copying default background to ' + resolve(appPath, config.System.Path.Temp));
	fileBuffer = readFileSync(join(__dirname, `/_player/assets/${state.version.image}`));
	const tempBackground = resolve(appPath, config.System.Path.Temp, 'default.jpg');
	if (await asyncExists(tempBackground)) await asyncUnlink(tempBackground);
	writeFileSync(tempBackground, fileBuffer);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug('[Launcher] Copying blank.png to ' + resolve(appPath, config.System.Path.Avatars));
	fileBuffer = readFileSync(join(__dirname, '/_webapp/ressources/img/blank.png'));
	const tempAvatar = resolve(appPath, config.System.Path.Avatars, 'blank.png');
	if (await asyncExists(tempAvatar)) await asyncUnlink(tempAvatar);
	writeFileSync(tempAvatar, fileBuffer);

	/**
	 * Test if network ports are available
	 */
	verifyOpenPort(config.Frontend.Port);

	/**
	 * Gentlemen, start your engines.
	 */
	try {
		await initEngine();
	} catch(err) {
		logger.error(`[Launcher] Karaoke Mugen initialization failed :( : ${err}`);
		exit(1);
	}
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
async function checkPaths(config: Config) {

	const appPath: string = getState().appPath;

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
	// Emptying temp directory
	if (await asyncExists(resolve(appPath, config.System.Path.Temp))) await asyncRemove(resolve(appPath, config.System.Path.Temp));
	// Checking paths
	let checks = [];
	config.System.Path.Karas.forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.System.Path.Series.forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.System.Path.Lyrics.forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.System.Path.Medias.forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.System.Path.Jingles.forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	config.System.Path.Backgrounds.forEach(dir => checks.push(asyncCheckOrMkdir(appPath, dir)));
	checks.push(asyncCheckOrMkdir(appPath, config.System.Path.Avatars));
	checks.push(asyncCheckOrMkdir(appPath, config.System.Path.Bin));
	checks.push(asyncCheckOrMkdir(appPath, config.System.Path.DB));
	checks.push(asyncCheckOrMkdir(appPath, config.System.Path.Import));
	checks.push(asyncCheckOrMkdir(appPath, config.System.Path.Temp));
	checks.push(asyncCheckOrMkdir(appPath, config.System.Path.Previews));

	await Promise.all(checks);
	logger.debug('[Launcher] Directory checks complete');
}

function verifyOpenPort(port: number) {
	const server = createServer();
	server.once('error', err => {
		if (err) {
			logger.error(`[Launcher] Port ${port} is already in use.`);
			console.log('\nIf another Karaoke Mugen instance is running, please kill it (process name is "node" or "KaraokeMugen")');
			console.log('Also verify that no postgreSQL server is running on said port');
			console.log('Then restart the app.');
			process.exit(1);
		}
	});
	server.once('listening', () => server.close());
	server.listen(port);
}

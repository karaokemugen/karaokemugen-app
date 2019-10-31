import {asyncCheckOrMkdir, asyncReadDir, asyncExists, asyncRemove,  asyncCopyAlt} from './lib/utils/files';
import {getConfig} from './lib/utils/config';
import {initConfig} from './utils/config';
import {Config} from './types/config';
import {parseCommandLineArgs} from './args';
import {copy} from 'fs-extra';
import {join, resolve} from 'path';
import {createServer} from 'net';
import logger, { configureLogger } from './lib/utils/logger';
import minimist from 'minimist';
import {exit, initEngine} from './services/engine';
import {logo} from './logo';
import chalk from 'chalk';
import {createInterface} from 'readline';
import { setState, getState } from './utils/state';
import { version } from './version';

process.on('uncaughtException', exception => {
	console.log('Uncaught exception:', exception);
});

process.on('unhandledRejection', (error) => {
	console.log('Unhandled Rejection at:', error);
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
('pkg' in process)
	? appPath = join(process['execPath'],'../')
	: appPath = join(__dirname,'../');
setState({appPath: appPath});

process.env['NODE_ENV'] = 'production'; // Default

main()
	.catch(err => {
		logger.error(`[Launcher] Error during launch : ${err}`);
		console.log(err);
		exit(1);
	});

async function main() {
	const argv = minimist(process.argv.slice(2));
	setState({ os: process.platform, version: version });
	const state = getState();
	console.log(chalk.blue(logo));
	console.log('Karaoke Player & Manager - http://karaokes.moe');
	console.log(`Version ${chalk.bold.green(state.version.number)} (${chalk.bold.green(state.version.name)})`);
	console.log('================================================================');
	await configureLogger(appPath, !!argv.debug, true);
	await initConfig(argv);
	let config = getConfig();
	await parseCommandLineArgs(argv);
	logger.debug(`[Launcher] AppPath : ${appPath}`);
	logger.debug(`[Launcher] Locale : ${state.EngineDefaultLocale}`);
	logger.debug(`[Launcher] OS : ${state.os}`);
	logger.debug(`[Launcher] Loaded configuration : ${JSON.stringify(config, null, 2)}`);
	logger.debug(`[Launcher] Initial state : ${JSON.stringify(state, null, 2)}`);

	// Checking paths, create them if needed.
	await checkPaths(config);

	// Copying files from the app's sources to the app's working folder.
	// This is an ugly hack : we could use fs.copy but due to a bug in pkg,
	// using a writeFile/readFile combination is making it work with recent versions
	// of pkg, thus allowing us to build for Node 10
	// See https://github.com/zeit/pkg/issues/420

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	const tempInput = resolve(appPath, config.System.Path.Temp, 'input.conf');
	logger.debug(`[Launcher] Copying input.conf to ${tempInput}`);
	await asyncCopyAlt(join(__dirname, '../assets/input.conf'), tempInput)

	const tempBackground = resolve(appPath, config.System.Path.Temp, 'default.jpg');
	logger.debug(`[Launcher] Copying default background to ${tempBackground}`);
	await asyncCopyAlt(join(__dirname, `../assets/${state.version.image}`), tempBackground);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`[Launcher] Copying blank.png to ${resolve(appPath, config.System.Path.Avatars)}`);
	await asyncCopyAlt(join(__dirname, '../assets/blank.png'), resolve(appPath, config.System.Path.Avatars, 'blank.png'));

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
		console.log(err);
		logger.error(`[Launcher] Karaoke Mugen initialization failed :( : ${err}`);
		exit(1);
	}
}

/**
 * Checking if application paths exist.
 */
async function checkPaths(config: Config) {

	const appPath = getState().appPath;

	// If no karaoke is found, copy the samples directory if it exists
	if (!await asyncExists(resolve(appPath, 'app/data'))) {
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
	const paths = config.System.Path;
	for (const item of Object.keys(paths)) {
		Array.isArray(paths[item])
			? paths[item].forEach((dir: string) => checks.push(asyncCheckOrMkdir(appPath, dir)))
			: checks.push(asyncCheckOrMkdir(appPath, paths[item]));
	}
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

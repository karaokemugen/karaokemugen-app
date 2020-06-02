// KM Imports
import {asyncCheckOrMkdir, asyncCopy, asyncExists, asyncReadFile, asyncRemove} from './lib/utils/files';
import {configureLocale, getConfig, resolvedPathAvatars, resolvedPathTemp, setConfig} from './lib/utils/config';
import {initConfig} from './utils/config';
import {parseCommandLineArgs} from './utils/args';
import logger, {configureLogger} from './lib/utils/logger';
import {exit, initEngine} from './components/engine';
import {logo} from './logo';
import {getState, setState} from './utils/state';
import {version} from './version';
import {migrateOldFoldersToRepo} from './services/repo';
import {errorStep, initStep} from './electron/electronLogger';
import {startElectron} from './electron/electron';
import {help} from './help';
import {initSentry, sentryError} from "./lib/utils/sentry";
import {createCircleAvatar} from './utils/imageProcessing';
import {startTipLoop, stopTipLoop} from "./utils/tips";
// Types
import {Config} from './types/config';
// Node modules
import i18n from 'i18next';
import {mkdirpSync} from 'fs-extra';
import {dirname, join, resolve} from 'path';
import {existsSync} from 'fs';
import minimist from 'minimist';
import chalk from 'chalk';
import {createInterface} from 'readline';
import {getPortPromise} from 'portfinder';
import {app, dialog} from 'electron';
import cloneDeep from 'lodash.clonedeep';
import dotenv from 'dotenv';

dotenv.config();


// This allows TypeScript to detect our global value
declare global {
	namespace NodeJS {
	  interface Global {
		__rootdir__: string;
	  }
	}
  }

global.__rootdir__ = __dirname || process.cwd();

initSentry(app);

process.on('uncaughtException', exception => {
	console.log('Uncaught exception:', exception);
	if (logger) logger.error(`[UncaughtException]` + exception);
	sentryError(exception);
	if (app) dialog.showMessageBox({
		type: 'none',
		title: 'Karaoke Mugen Error : Uncaught Exception',
		message: `Name: ${exception.name}
Message: ${exception.message}
Stack: ${exception.stack}
`
	});
});

process.on('unhandledRejection', error => {
	console.log('Unhandled Rejection at:', error);
	let errStr: string;
	try {
		errStr = JSON.stringify(error);
	} catch(err) {
		errStr = error.toString();
	}
	if (logger) logger.error(`[UnhandledRejection]` + errStr);
	sentryError(new Error(errStr));
	if (app) {
		dialog.showMessageBox({
		type: 'none',
		title: 'Karaoke Mugen Error : Unhandled Rejection',
		message: JSON.stringify(error)
	});
	}
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
// Testing if we're in a packaged version of KM or not.
// First, this is a test for unpacked electron mode.
// If we're not using electron, then use __dirname's parent)
let originalAppPath: string;
if (process.versions.electron) {
	//INIT_CWD exists only when electron is launched from yarn (dev)
	//PORTABLE_EXECUTABLE_DIR exists only when launched from a packaged eletron app (yarn dist) (production)
	// The last one is when running an unpackaged electron for testing purposes (yarn packer) (dev)
	originalAppPath = process.env.INIT_CWD || process.env.PORTABLE_EXECUTABLE_DIR || join(__dirname, '../../../');
	// Because OSX packages are structured differently, we'll modify our path
	if (process.platform === 'darwin' && app.isPackaged) originalAppPath = resolve(originalAppPath, '../../');
} else {
	originalAppPath = process.cwd();
}
// On OSX, process.cwd() returns /, which is utter stupidity but let's go along with it.
// What's funny is that originalAppPath is correct on OSX no matter if you're using Electron or not.
const appPath = process.platform === 'darwin'
	? app?.isPackaged
		? resolve(dirname(process.execPath), '../')
		: originalAppPath
	: process.cwd();
// Resources are all the stuff our app uses and is bundled with. mpv config files, default avatar, background, migrations, locales, etc.
let resourcePath: string;

if (process.versions.electron && (existsSync(resolve(appPath, 'resources/')) || existsSync(resolve(originalAppPath, 'resources/')))) {
	// If launched from electron we check if cwd/resources exists and set it to resourcePath. If not we'll use appPath
	// CWD = current working directory, so if launched from a dist exe, this is $HOME/AppData/Local/ etc. on Windows, and equivalent path on Unix systems.
	// It also works from unpackaged electron, if all things are well.
	// If it doesn't exist, we'll assume the resourcePath is originalAppPath.
	if (process.platform === 'darwin') {
		resourcePath = process.resourcesPath
	} else if (existsSync(resolve(appPath, 'resources/'))) {
		resourcePath = resolve(appPath, 'resources/');
	} else if (existsSync(resolve(originalAppPath, 'resources/'))) {
		resourcePath = resolve(originalAppPath, 'resources/');
	} else {
		resourcePath = originalAppPath;
	}
} else {
	resourcePath = originalAppPath;
}

// DataPath is by default appPath + app. This is default when running from source
const dataPath = existsSync(resolve(originalAppPath, 'portable'))
	? resolve(originalAppPath, 'app/')
	// Rewriting dataPath to point to user home directory
	: app
		// With Electron we get the handy app.getPath()
		? resolve(app.getPath('home'), 'KaraokeMugen')
		// process.env.HOMEPATH is broken in Windows as it does not reference the drive letter, so if you installed KM on D:\KM, it'll point to D:\Users\your_user\KaraokeMugen. Deal with it.
		: resolve(process.env.HOME || process.env.HOMEPATH, 'KaraokeMugen');

if (!existsSync(dataPath)) mkdirpSync(dataPath);

if (existsSync(resolve(originalAppPath, 'disableAppUpdate'))) setState({forceDisableAppUpdate: true});

setState({originalAppPath: originalAppPath, appPath: appPath, dataPath: dataPath, resourcePath: resourcePath});

process.env['NODE_ENV'] = 'production'; // Default

// Electron packaged app does not need a slice(2) but a (1) since it has no script argument
const argArr = app?.isPackaged
	? process.argv.slice(1)
	: process.argv.slice(2);
const argv = minimist(argArr);

if (app) {
	app.on('will-quit', () => {
		exit(0);
	});
}

if (app && !argv.cli) {
	try {
		startElectron();
	} catch(err) {
		console.log(err);
	}
} else {
	// This is in case we're running with yarn startNoElectron
	preInit()
		.then(() => main())
		.catch(err => {
			logger.error(`[Launcher] Error during launch : ${err}`);
			console.log(err);
			sentryError(err);
			exit(1);
		});
}

export async function preInit() {
	await configureLocale();
	await configureLogger(dataPath, argv.debug || (app?.commandLine.hasSwitch('debug')), true);
	setState({ os: process.platform, version: version});
	const state = getState();
	await parseCommandLineArgs(argv, app ? app.commandLine : null);
	logger.debug(`[Launcher] AppPath : ${appPath}`);
	logger.debug(`[Launcher] DataPath : ${dataPath}`);
	logger.debug(`[Launcher] ResourcePath : ${resourcePath}`);
	logger.debug(`[Launcher] Electron ResourcePath : ${process.resourcesPath}`);
	logger.debug(`[Launcher] OriginalAppPath : ${originalAppPath}`);
	logger.debug(`[Launcher] INIT_CWD : ${process.env.INIT_CWD}`);
	logger.debug(`[Launcher] PORTABLE_EXECUTABLE_DIR : ${process.env.PORTABLE_EXECUTABLE_DIR}`);
	logger.debug(`[Launcher] app.getAppPath : ${app ? app.getAppPath() : undefined}`);
	logger.debug(`[Launcher] argv: ${JSON.stringify(process.argv)}`);
	logger.debug(`[Launcher] Locale : ${state.defaultLocale}`);
	logger.debug(`[Launcher] OS : ${state.os}`);
	await initConfig(argv);
}

export async function main() {
	initStep(i18n.t('INIT_INIT'));
	startTipLoop('normal');
	// Set version number
	let sha: string;
	const SHAFile = resolve(resourcePath, 'assets/sha.txt');
	if (await asyncExists(SHAFile)) {
		sha = await asyncReadFile(SHAFile, 'utf-8');
		setState({version: {sha: sha.substr(0, 8)}});
	} else {
		const branch = getState().version.number.split('-')[1];
		try {
			sha = await asyncReadFile(resolve(originalAppPath, '.git/refs/heads/', branch), 'utf-8');
			setState({version: {sha: sha.substr(0, 8)}});
		} catch(err) {
			// Ignore
		}
	}
	const state = getState();
	console.log(chalk.white(logo));
	console.log('Karaoke Player & Manager - http://karaokes.moe');
	console.log(`Version ${chalk.bold.green(state.version.number)} (${chalk.bold.green(state.version.name)})`);
	if (sha) console.log(`git commit : ${sha}`);
	console.log('================================================================================');
	if (argv.version) {
		app.exit(0);
	} else if (argv.help) {
		console.log(help);
		app.exit(0);
	} else {
		const config = getConfig();
		const publicConfig = cloneDeep(config);
		publicConfig.Karaoke.StreamerMode.Twitch.OAuth = 'xxxxx';
		publicConfig.App.JwtSecret = 'xxxxx';
		publicConfig.App.InstanceID = 'xxxxx';
		logger.debug(`[Launcher] Loaded configuration : ${JSON.stringify(publicConfig)}`);
		logger.debug(`[Launcher] Initial state : ${JSON.stringify(state)}`);

		// Checking paths, create them if needed.
		await checkPaths(getConfig());

		// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
		const tempInput = resolve(resolvedPathTemp(), 'input.conf');
		logger.debug(`[Launcher] Copying input.conf to ${tempInput}`);
		await asyncCopy(resolve(resourcePath, 'assets/input.conf'), tempInput);

		const tempBackground = resolve(resolvedPathTemp(), 'default.jpg');
		logger.debug(`[Launcher] Copying default background to ${tempBackground}`);
		await asyncCopy(resolve(resourcePath, `assets/${state.version.image}`), tempBackground);

		// Copy avatar blank.png if it doesn't exist to the avatar path
		logger.debug(`[Launcher] Copying blank.png to ${resolvedPathAvatars()}`);
		await asyncCopy(resolve(resourcePath, 'assets/blank.png'), resolve(resolvedPathAvatars(), 'blank.png'));
		createCircleAvatar(resolve(resolvedPathAvatars(), 'blank.png'));

		/**
		 * Test if network ports are available
		 */
		await verifyOpenPort(getConfig().Frontend.Port, getConfig().App.FirstRun);

		/**
		 * Gentlemen, start your engines.
		 */
		try {
			await initEngine();
			stopTipLoop();
		} catch(err) {
			logger.error(`[Launcher] Karaoke Mugen initialization failed : ${err}`);
			sentryError(err);
			console.log(err);
			errorStep(i18n.t('ERROR_UNKNOWN'));
			startTipLoop('errors');
			if (!app || argv.cli) exit(1);
		}
	}
}

/**
 * Checking if application paths exist.
 */
async function checkPaths(config: Config) {
	// Migrate old folder config to new repository one :
	await migrateOldFoldersToRepo();

	// Emptying temp directory
	if (await asyncExists(resolvedPathTemp())) await asyncRemove(resolvedPathTemp());
	// Checking paths
	let checks = [];
	const paths = config.System.Path;
	for (const item of Object.keys(paths)) {
		Array.isArray(paths[item]) && paths[item]
			? paths[item].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))))
			: checks.push(asyncCheckOrMkdir(resolve(dataPath, paths[item])));
	}
	for (const repo of config.System.Repositories) {
		for (const paths of Object.keys(repo.Path)) {
			repo.Path[paths].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))));
		}
	}
	checks.push(asyncCheckOrMkdir(resolve(dataPath, 'logs/')));

	try {
		await Promise.all(checks);
		logger.debug('[Launcher] Directory checks complete');
	} catch(err) {
		errorStep(i18n.t('ERROR_INIT_PATHS'));
		throw err;
	}
}

async function verifyOpenPort(portConfig: number, firstRun: boolean) {
	try {
		const port = await getPortPromise({
			port: portConfig,
			stopPort: 7331
		});
		if (firstRun && port !== portConfig) {
			logger.warn(`[Launcher] Port ${portConfig} is already in use. Switching to ${port} and saving configuration`);
			setConfig({Frontend: {Port: port}});
		}
	} catch(err) {
		throw new Error('Failed to find a free port to use');
	}
}


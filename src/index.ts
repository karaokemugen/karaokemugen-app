import chalk from 'chalk';
import dotenv from 'dotenv';
import {app} from 'electron';
import {existsSync, readFileSync} from 'fs';
import {copy, mkdirpSync, remove} from 'fs-extra';
import i18n from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {dirname,resolve} from 'path';
import {getPortPromise} from 'portfinder';
import {createInterface} from 'readline';

import {exit, initEngine} from './components/engine';
import {focusWindow, handleFile,handleProtocol,startElectron} from './electron/electron';
import {errorStep, initStep} from './electron/electronLogger';
import {configureLocale, getConfig, resolvedPathAvatars, resolvedPathImport, resolvedPathPreviews, resolvedPathSessionExports, resolvedPathTemp, setConfig} from './lib/utils/config';
import {asyncCheckOrMkdir, asyncExists} from './lib/utils/files';
import logger, {configureLogger} from './lib/utils/logger';
import { on } from './lib/utils/pubsub';
import { resetSecurityCode } from './services/auth';
import {Config} from './types/config';
import {parseArgs, setupFromCommandLineArgs} from './utils/args';
import {initConfig} from './utils/config';
import {logo} from './utils/constants';
import sentry from './utils/sentry';
import {getState, setState} from './utils/state';

dotenv.config();
sentry.init(app, process.argv.includes('--strict'));

let isInitError = false;

process.on('uncaughtException', (exception: any) => {
	// Silence when an error has been triggered during init, because objects get destroyed and electron doesn't like that much, poor boy.
	if (!isInitError) {
		console.log('Uncaught exception:', exception);
		if (logger) logger.error('', {service: 'UncaughtException', obj: exception});
		sentry.error(exception);
	}
});

process.on('unhandledRejection', (error: Error) => {
	console.log('Unhandled Rejection at:', error);
	if (logger) logger.error('', {service: 'UnhandledRejection', obj: error});
	sentry.error(error);
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

on('initError', (err: Error) => {
	isInitError = true;
	initError(err);
});

// Main app begins here.
// Testing if we're in a packaged version of KM or not.
// First, this is a test for unpacked electron mode.
let appPath: string;
// Resources are all the stuff our app uses and is bundled with. mpv config files, default avatar, background, migrations, locales, etc.
let resourcePath: string;

if (process.versions.electron) {
	if (app.isPackaged) {
		// Starting Electron from the app's executable
		appPath = process.platform === 'darwin'
			? resolve(app.getAppPath(), '../../../../')
			: resolve(app.getAppPath(), '../../');
		resourcePath = process.resourcesPath;
	} else {
		if (app.getAppPath().endsWith('.asar')) {
			// Starting Electron from an asar directly (electron /path/to/app.asar)
			appPath = dirname(app.getAppPath());
			resourcePath = appPath;
		} else {
			// Starting Electron from source folder
			appPath = app.getAppPath();
			resourcePath = appPath;
		}
	}
} else {
	// Non-electron environments (ts-node, node)
	appPath = process.cwd();
	resourcePath = appPath;
}

// DataPath is by default appPath + app. This is default when running from source
const dataPath = existsSync(resolve(appPath, 'portable'))
	? resolve(appPath, 'app/')
	// Rewriting dataPath to point to user home directory
	: app
		// With Electron we get the handy app.getPath()
		? resolve(app.getPath('home'), 'KaraokeMugen')
		// process.env.HOMEPATH is broken in Windows as it does not reference the drive letter, so if you installed KM on D:\KM, it'll point to D:\Users\your_user\KaraokeMugen. Deal with it.
		: resolve(process.env.HOME || process.env.HOMEPATH, 'KaraokeMugen');

if (!existsSync(dataPath)) mkdirpSync(dataPath);

if (existsSync(resolve(appPath, 'disableAppUpdate'))) setState({forceDisableAppUpdate: true});

setState({appPath: appPath, dataPath: dataPath, resourcePath: resourcePath});

process.env['NODE_ENV'] = 'production'; // Default

// Electron packaged app does not need a slice(2) but a (1) since it has no script argument
const args = app?.isPackaged
	? process.argv.slice(1)
	: process.argv.slice(2);

setState({ args: args });

// Set SHA
let sha: string;
const SHAFile = resolve(resourcePath, 'assets/sha.txt');
if (existsSync(SHAFile)) {
	sha = readFileSync(SHAFile, 'utf-8');
	setState({version: {sha: sha.substr(0, 8)}});
} else {
	const branch = getState().version.number.split('-')[1];
	try {
		sha = readFileSync(resolve(appPath, '.git/refs/heads/', branch), 'utf-8');
		setState({version: {sha: sha.substr(0, 8)}});
	} catch(err) {
		// Ignore
	}
}

// Commander call to get everything setup in argv
const argv = parseArgs();

if (app) {
	// Acquiring lock to prevent two KMs to run at the same time.
	// Also allows to get us the files we need.
	if (!app.requestSingleInstanceLock()) process.exit();
	app.on('second-instance', (_event, args) => {
		if (args[args.length-1] === '--kill') {
			exit(0);
		} else {
			focusWindow();
			const file = args[args.length-1];
			if (file && file !== '.' && !file.startsWith('--')) {
				file.startsWith('km://')
					? handleProtocol(file.substr(5).split('/'))
					: handleFile(file);
			}
		}
	});
	// Redefining quit function
	app.on('will-quit', () => {
		exit(0);
	});
}

if (app && !argv.opts().cli) {
	startElectron();
} else {
	// This is in case we're running with yarn startNoElectron or with --cli or --help
	preInit()
		.then(() => main())
		.catch(err => initError(err));
}

export async function preInit() {
	await configureLocale();
	await configureLogger(dataPath, argv.opts().debug || (app?.commandLine.hasSwitch('debug')), true);
	resetSecurityCode();
	setState({ os: process.platform });
	const state = getState();
	setupFromCommandLineArgs(argv, app ? app.commandLine : null);
	logger.debug(`AppPath : ${appPath}`, {service: 'Launcher'});
	logger.debug(`DataPath : ${dataPath}`, {service: 'Launcher'});
	logger.debug(`ResourcePath : ${resourcePath}`, {service: 'Launcher'});
	logger.debug(`Electron ResourcePath : ${process.resourcesPath}`, {service: 'Launcher'});
	logger.debug(`INIT_CWD : ${process.env.INIT_CWD}`, {service: 'Launcher'});
	logger.debug(`PORTABLE_EXECUTABLE_DIR : ${process.env.PORTABLE_EXECUTABLE_DIR}`, {service: 'Launcher'});
	logger.debug(`app.getAppPath : ${app ? app.getAppPath() : undefined}`, {service: 'Launcher'});
	logger.debug(`argv: ${JSON.stringify(process.argv)}`, {service: 'Launcher'});
	logger.debug(`Locale : ${state.defaultLocale}`, {service: 'Launcher'});
	logger.debug(`OS : ${state.os}`, {service: 'Launcher'});
	await initConfig(argv);
	/**
	 * Test if network ports are available
	 */
	await verifyOpenPort(getConfig().Frontend.Port, getConfig().App.FirstRun);
}

export async function main() {
	initStep(i18n.t('INIT_INIT'));
	// Set version number
	const state = getState();
	console.log(chalk.white(logo));
	console.log('Karaoke Player & Manager - http://karaokes.moe');
	console.log(`Version ${chalk.bold.green(state.version.number)} "${chalk.bold.green(state.version.name)}" (${sha ? sha.substr(0, 8) : 'UNKNOWN'})`);
	console.log('================================================================================');
	const config = getConfig();
	const publicConfig = cloneDeep(config);
	publicConfig.Karaoke.StreamerMode.Twitch.OAuth = 'xxxxx';
	publicConfig.App.JwtSecret = 'xxxxx';
	publicConfig.App.InstanceID = 'xxxxx';
	logger.debug('Loaded configuration', {service: 'Launcher', obj: publicConfig});
	logger.debug('Initial state', {service: 'Launcher', obj: state});

	// Checking paths, create them if needed.
	await checkPaths(getConfig());
	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	const tempInput = resolve(resolvedPathTemp(), 'input.conf');
	logger.debug(`Copying input.conf to ${tempInput}`, {service: 'Launcher'});
	await copy(resolve(resourcePath, 'assets/input.conf'), tempInput);

	const tempBackground = resolve(resolvedPathTemp(), 'default.jpg');
	logger.debug(`Copying default background to ${tempBackground}`, {service: 'Launcher'});
	await copy(resolve(resourcePath, 'assets/backgrounds/default.jpg'), tempBackground);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`Copying blank.png to ${resolvedPathAvatars()}`, {service: 'Launcher'});
	await copy(resolve(resourcePath, 'assets/blank.png'), resolve(resolvedPathAvatars(), 'blank.png'));

	/**
	 * Gentlemen, start your engines.
	 */
	try {
		await initEngine();
	} catch(err) {
		logger.error('Karaoke Mugen initialization failed', {service: 'Launcher', obj: err});
		sentry.error(err);
		console.log(err);
		errorStep(i18n.t('ERROR_UNKNOWN'));
		if (!app || argv.opts().cli) exit(1);
	}
}

/**
 * Checking if application paths exist.
 */
async function checkPaths(config: Config) {
	try {
		// Emptying temp directory
		if (await asyncExists(resolvedPathTemp())) await remove(resolvedPathTemp());
		// Emptying import directory
		if (await asyncExists(resolvedPathImport())) await remove(resolvedPathImport());
		// Checking paths
		const checks = [];
		const paths = config.System.Path;
		for (const item of Object.keys(paths)) {
			paths[item] && Array.isArray(paths[item])
				? paths[item].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))))
				: checks.push(asyncCheckOrMkdir(resolve(dataPath, paths[item])));
		}
		for (const repo of config.System.Repositories) {
			for (const paths of Object.keys(repo.Path)) {
				repo.Path[paths].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))));
			}
		}
		checks.push(asyncCheckOrMkdir(resolve(dataPath, 'logs/')));
		checks.push(asyncCheckOrMkdir(resolvedPathSessionExports()));
		checks.push(asyncCheckOrMkdir(resolvedPathPreviews()));
		await Promise.all(checks);
		logger.debug('Directory checks complete', {service: 'Launcher'});
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
		setState({frontendPort: port});
		if (port !== portConfig) {
			logger.warn(`Port ${portConfig} is already in use. Switching to ${port}`, {service: 'Launcher'});
			if (firstRun) {
				setConfig({Frontend: {Port: port}});
				logger.warn('This is first run, saving port configuration', {service: 'Launcher'});
			}
		}
	} catch(err) {
		throw new Error('Failed to find a free port to use');
	}
}

function initError(err: any) {
	logger.error('Error during launch', {service: 'Launcher', obj: err});
	console.log(err);
	sentry.error(err);
	exit(1);
}

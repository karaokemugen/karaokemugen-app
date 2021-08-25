import chalk from 'chalk';
import dotenv from 'dotenv';
import {app} from 'electron';
import {existsSync, readFileSync} from 'fs';
import {copy, mkdirpSync, remove} from 'fs-extra';
import i18n from 'i18next';
import {dirname,resolve} from 'path';
import {getPortPromise} from 'portfinder';
import {createInterface} from 'readline';

import {exit, initEngine} from './components/engine';
import {startElectron} from './electron/electron';
import {errorStep, initStep} from './electron/electronLogger';
import {
	configureLocale,
	getConfig,
	resolvedPathAvatars,
	resolvedPathBundledBackgrounds,
	resolvedPathImport,
	resolvedPathPreviews,
	resolvedPathSessionExports,
	resolvedPathStreamFiles,
	resolvedPathTemp,
	setConfig
} from './lib/utils/config';
import {asyncCheckOrMkdir, asyncCopyAll} from './lib/utils/files';
import logger, {configureLogger} from './lib/utils/logger';
import { on } from './lib/utils/pubsub';
import { resetSecurityCode } from './services/auth';
import { migrateReposToZip } from './services/repo';
import {Config} from './types/config';
import {parseArgs, setupFromCommandLineArgs} from './utils/args';
import {initConfig} from './utils/config';
import {logo} from './utils/constants';
import sentry from './utils/sentry';
import {getState, setState} from './utils/state';

dotenv.config();
sentry.init(process.argv.includes('--strict'));

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
	exit(0);
});

process.on('SIGTERM', () => {
	exit(0);
});

// CTRL+C for Windows :

if (process.platform === 'win32' ) {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on('SIGINT', () => {
		exit(0);
	});
}

on('initError', (err: Error) => {
	isInitError = true;
	initError(err);
});

// Main app begins here.
let appPath: string;
// Resources are all the stuff our app uses and is bundled with. mpv config files, default avatar, background, migrations, locales, etc.
let resourcePath: string;

// Testing if we're in a packaged version of KM or not.
// First, this is a test for unpacked electron mode.
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

// DataPath is by default appPath + app. This is default when running from source
const dataPath = existsSync(resolve(appPath, 'portable'))
	? resolve(appPath, 'app/')
	// Rewriting dataPath to point to user home directory
	// With Electron we get the handy app.getPath()
	: resolve(app.getPath('home'), 'KaraokeMugen');

if (!existsSync(dataPath)) mkdirpSync(dataPath);

if (existsSync(resolve(appPath, 'disableAppUpdate'))) setState({forceDisableAppUpdate: true});

setState({appPath, dataPath, resourcePath});

process.env['NODE_ENV'] = 'production'; // Default

// Electron packaged app does not need a slice(2) but a (1) since it has no script argument
const args = app.isPackaged
	? process.argv.slice(1)
	: process.argv.slice(2);

setState({ args: args });

// Set SHA commit hash. This is to display precise version number.
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

// Let's go! This calls the functions below.
// Start Electron -> Pre Init -> Main Init -> Engine Init -> Post Init
startElectron();

/** First step of init : locale, config, logger, state... */
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
	// Test if network ports are available
	await verifyOpenPort(getConfig().System.FrontendPort, getConfig().App.FirstRun);
}

/** Initialize folders, paths and start the engine */
export async function main() {
	initStep(i18n.t('INIT_INIT'));
	// Set version number
	const state = getState();
	console.log(chalk.white(logo));
	console.log('Karaoke Player & Manager - https://karaokes.moe');
	console.log(`Version ${chalk.bold.green(state.version.number)} "${chalk.bold.green(state.version.name)}" (${sha ? sha.substr(0, 8) : 'UNKNOWN'})`);
	console.log('================================================================================');
	logger.debug('Initial state', {service: 'Launcher', obj: state});

	// Migrate repos to git
	await migrateReposToZip();
	// Checking paths, create them if needed.
	await checkPaths(getConfig());
	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	const tempInput = resolve(resolvedPathTemp(), 'input.conf');
	logger.debug(`Copying input.conf to ${tempInput}`, {service: 'Launcher'});
	await copy(resolve(resourcePath, 'assets/input.conf'), tempInput);

	const bundledBackgrounds = resolvedPathBundledBackgrounds();
	logger.debug(`Copying default backgrounds to ${bundledBackgrounds}`, {service: 'Launcher'});	
	await asyncCopyAll(resolve(resourcePath, 'assets/backgrounds'), `${bundledBackgrounds}/`);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`Copying blank.png to ${resolvedPathAvatars()}`, {service: 'Launcher'});
	await copy(resolve(resourcePath, 'assets/blank.png'), resolve(resolvedPathAvatars(), 'blank.png'));

	// Gentlemen, start your engines.
	try {
		await initEngine();
	} catch(err) {
		logger.error('Karaoke Mugen initialization failed', {service: 'Launcher', obj: err});
		sentry.error(err);
		console.log(err);
		errorStep(i18n.t('ERROR_UNKNOWN'));
		if (argv.opts().cli) exit(1);
	}
}

/* Checking if application paths exist. **/
async function checkPaths(config: Config) {
	try {
		// Emptying temp directory
		try {
			await remove(resolvedPathTemp());
		} catch(err) {
			// Non-fatal
		}
		// Emptying bundled backgrounds directory
		try {
			await remove(resolvedPathBundledBackgrounds());
		} catch(err) {
			// Non-fatal
		}
		// Emptying import directory
		try {
			await remove(resolvedPathImport());
		} catch(err) {
			// Non-fatal
		}
		// Checking paths
		const checks = [];
		const paths = config.System.Path;
		for (const item of Object.keys(paths)) {
			paths[item] && Array.isArray(paths[item])
				? paths[item].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))))
				: checks.push(asyncCheckOrMkdir(resolve(dataPath, paths[item])));
		}
		for (const repo of config.System.Repositories) {
			checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir)));
			checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'karaokes')));
			checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'lyrics')));
			checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'tags')));
			checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'hooks')));
			for (const paths of Object.keys(repo.Path)) {
				repo.Path[paths].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))));
			}
		}
		checks.push(asyncCheckOrMkdir(resolve(dataPath, 'logs/')));
		checks.push(asyncCheckOrMkdir(resolvedPathSessionExports()));
		checks.push(asyncCheckOrMkdir(resolvedPathPreviews()));
		checks.push(asyncCheckOrMkdir(resolvedPathStreamFiles()));
		checks.push(asyncCheckOrMkdir(resolvedPathBundledBackgrounds()));
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
				setConfig({System: {FrontendPort: port}});
				logger.warn('This is first run, saving port configuration', {service: 'Launcher'});
			}
		}
	} catch(err) {
		throw new Error('Failed to find a free port to use');
	}
}

/** This is called only if we have an init error during preInit */
function initError(err: any) {
	logger.error('Error during launch', {service: 'Launcher', obj: err});
	console.log(err);
	sentry.error(err);
	exit(1);
}

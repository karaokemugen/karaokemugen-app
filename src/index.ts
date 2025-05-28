import dotenv from 'dotenv';
import { app } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { mkdirpSync } from 'fs-extra';
import { dirname, resolve } from 'path';
import { createInterface } from 'readline';
import sourceMapSupport from 'source-map-support';

import { exit } from './components/engine.js';
import { startElectron } from './electron/electron.js';
import logger from './lib/utils/logger.js';
import { moveUserDir } from './utils/hokutoNoCode.js';
import sentry from './utils/sentry.js';
import { setState } from './utils/state.js';

/** Welcome to Karaoke Mugen's beginning and end.
 * Emergency exits are on your left and right.
 */

sourceMapSupport.install();

const service = 'Launcher';

process.on('uncaughtException', (exception: any) => {
	console.log('Uncaught exception:', exception);
	if (logger) logger.error('', { service: 'UncaughtException', obj: exception });
	sentry.error(exception);
});

process.on('unhandledRejection', (error: Error) => {
	console.log('Unhandled Rejection at:', error);
	if (logger) logger.error('', { service: 'UnhandledRejection', obj: error });
	sentry.error(error);
});

process.on('SIGINT', () => {
	exit(0);
});

process.on('SIGTERM', () => {
	exit(0);
});

// CTRL+C for Windows :

if (process.platform === 'win32') {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => {
		exit(0);
	});
}

// Main app begins here.
dotenv.config();

// Temp Fix for https://github.com/electron/electron/issues/46538
if (process.platform === 'linux') {
	app.commandLine.appendSwitch('gtk-version', '3');
}

let appPath: string;
// Resources are all the stuff our app uses and is bundled with. mpv config files, default avatar, background, migrations, locales, etc.
let resourcePath: string;

// Testing if we're in a packaged version of KM or not.
// First, this is a test for unpacked electron mode.
if (app.isPackaged) {
	// Starting Electron from the app's executable
	appPath =
		process.platform === 'darwin' ? resolve(app.getAppPath(), '../../../../') : resolve(app.getAppPath(), '../../');
	resourcePath = process.resourcesPath;
} else if (app.getAppPath().endsWith('.asar')) {
	// Starting Electron from an asar directly (electron /path/to/app.asar)
	appPath = dirname(app.getAppPath());
	resourcePath = appPath;
} else {
	// Starting Electron from source folder
	appPath = app.getAppPath();
	resourcePath = appPath;
}

try {
	process.env.SENTRY_DSN = readFileSync(resolve(resourcePath, 'assets/sentry.txt'), 'utf-8').replaceAll('\n', '');
} catch (err) {
	// Non-fatal, continue
}

// Rewriting Sentry DSN if we find a sentry.txt file before initializing it

sentry.init(process.argv.includes('--strict'));

// dataPath is appPath + /app. This is default when running from source or in portable mode
let dataPath = '';
if (existsSync(resolve(appPath, 'portable'))) {
	dataPath = resolve(appPath, 'app/');
} else {
	if (process.platform === 'linux') {
		// appData for Electron is XDG_CONFIG_HOME but we'll prefer XDG_DATA_HOME for config and stuff
		app.setPath('appData', process.env.XDG_DATA_HOME || resolve(process.env.HOME, '.local/share'));
	}
	dataPath = resolve(app.getPath('userData'), 'app/');
}

if (!existsSync(dataPath)) mkdirpSync(dataPath);

try {
	moveUserDir(dataPath);
} catch (err) {
	setState({ errorMovingUserDir: true });
	console.log(err);
	// Non-fatal, but users might panic.
}

if (existsSync(resolve(appPath, 'disableAppUpdate'))) setState({ forceDisableAppUpdate: true });

const portable = dataPath === resolve(appPath, 'app/');

setState({ appPath, dataPath, resourcePath, portable });

process.env.NODE_ENV = process.env.NODE_ENV || 'production'; // Default

// Electron packaged app does not need a slice(2) but a (1) since it has no script argument
const args = app.isPackaged ? process.argv.slice(1) : process.argv.slice(2);

setState({ args });

// Let's go! This calls the functions below.
// Start Electron -> Pre Init -> Main Init -> Engine Init -> Post Init
startElectron().catch(err => {
	if (logger) logger.error('Error during launch', { service, obj: err });
	console.log(err);
	sentry.error(err);
	exit(1);
});

import chalk from 'chalk';
import { app } from 'electron';
import {promises as fs} from 'fs';
import {copy, remove} from 'fs-extra';
import i18next from 'i18next';
import {resolve} from 'path';
import { getPortPromise } from 'portfinder';
import { resourcesPath } from 'process';

import { errorStep, initStep } from '../electron/electronLogger';
import { configureLocale, getConfig, resolvedPathAvatars, resolvedPathBundledBackgrounds, resolvedPathImport, resolvedPathPreviews, resolvedPathSessionExports, resolvedPathStreamFiles, resolvedPathTemp, setConfig } from '../lib/utils/config';
import { asyncCheckOrMkdir, asyncCopyAll, asyncExists } from '../lib/utils/files';
import logger, { configureLogger } from '../lib/utils/logger';
import { resetSecurityCode } from '../services/auth';
import { migrateReposToZip } from '../services/repo';
import { Config } from '../types/config';
import { parseArgs, setupFromCommandLineArgs } from '../utils/args';
import { initConfig } from '../utils/config';
import { logo } from '../utils/constants';
import Sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { exit, initEngine } from './engine';

// Commander call to get everything setup in argv
const argv = parseArgs();

async function getAppCommitSHA(): Promise<string> {
	// Set SHA commit hash. This is to display precise version number.
	let sha: string;
	const SHAFile = resolve(getState().resourcePath, 'assets/sha.txt');
	if (await asyncExists(SHAFile)) {
		sha = await fs.readFile(SHAFile, 'utf-8');
		setState({version: {sha: sha.substr(0, 8)}});
	} else {
		const branch = getState().version.number.split('-')[1];
		try {
			sha = await fs.readFile(resolve(getState().appPath, '.git/refs/heads/', branch), 'utf-8');
			setState({version: {sha: sha.substr(0, 8)}});
		} catch(err) {
			// Ignore
		}
	}
	return sha;
}

/** First step of init : locale, config, logger, state... */
export async function preInit() {
	const state = getState();
	await configureLocale();
	await configureLogger(state.dataPath, argv.opts().debug || (app?.commandLine.hasSwitch('debug')), true);
	resetSecurityCode();
	setState({ os: process.platform });
	setupFromCommandLineArgs(argv, app ? app.commandLine : null);
	logger.debug(`AppPath : ${state.appPath}`, {service: 'Launcher'});
	logger.debug(`DataPath : ${state.dataPath}`, {service: 'Launcher'});
	logger.debug(`ResourcePath : ${state.resourcePath}`, {service: 'Launcher'});
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
export async function init() {
	initStep(i18next.t('INIT_INIT'));
	// Set version number
	const sha = await getAppCommitSHA();
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
	await copy(resolve(state.resourcePath, 'assets/input.conf'), tempInput);

	const bundledBackgrounds = resolvedPathBundledBackgrounds();
	logger.debug(`Copying default backgrounds to ${bundledBackgrounds}`, {service: 'Launcher'});	
	await asyncCopyAll(resolve(resourcesPath, 'assets/backgrounds'), `${bundledBackgrounds}/`);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`Copying blank.png to ${resolvedPathAvatars()}`, {service: 'Launcher'});
	await copy(resolve(state.resourcePath, 'assets/blank.png'), resolve(resolvedPathAvatars(), 'blank.png'));

	// Gentlemen, start your engines.
	try {
		await initEngine();
	} catch(err) {
		logger.error('Karaoke Mugen initialization failed', {service: 'Launcher', obj: err});
		Sentry.error(err);
		console.log(err);
		errorStep(i18next.t('ERROR_UNKNOWN'));
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
		const dataPath = getState().dataPath;
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
		errorStep(i18next.t('ERROR_INIT_PATHS'));
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

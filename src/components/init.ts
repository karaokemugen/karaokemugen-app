import { app, dialog } from 'electron';
import { promises as fs } from 'fs';
import { copy, remove } from 'fs-extra';
import i18next from 'i18next';
import { resolve } from 'path';
import { getPortPromise } from 'portfinder';

import { win } from '../electron/electron';
import { errorStep, initStep } from '../electron/electronLogger';
import { PathType } from '../lib/types/config';
import { configureLocale, getConfig, resolvedPath, setConfig } from '../lib/utils/config';
import { asyncCheckOrMkdir, fileExists } from '../lib/utils/files';
import logger, { configureLogger } from '../lib/utils/logger';
import { resetSecurityCode } from '../services/auth';
import { backgroundTypes } from '../services/backgrounds';
import { editRepo } from '../services/repo';
import { Config } from '../types/config';
import { initConfig } from '../utils/config';
import { logo } from '../utils/constants';
import { migrateReposToZip, renameConfigKeys } from '../utils/hokutoNoCode';
import Sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { parseArgs, setupFromCommandLineArgs } from './args';
import { exit, initEngine } from './engine';

const service = 'Init';

// Commander call to get everything setup in argv
const argv = parseArgs();

async function getAppCommitSHA(): Promise<string> {
	// Set SHA commit hash. This is to display precise version number.
	let sha: string;
	const SHAFile = resolve(getState().resourcePath, 'assets/sha.txt');
	if (await fileExists(SHAFile)) {
		sha = await fs.readFile(SHAFile, 'utf-8');
		setState({ version: { sha } });
	} else {
		const branch = getState().version.number.split('-')[1];
		try {
			sha = (await fs.readFile(resolve(getState().appPath, '.git/refs/heads/', branch), 'utf-8')).slice(0, 8);
			setState({ version: { sha } });
		} catch (err) {
			// Ignore
		}
	}
	return sha;
}

/** First step of init : locale, config, logger, state... */
export async function preInit() {
	const state = getState();
	await configureLocale();
	await configureLogger(state.dataPath, argv.opts().debug || app?.commandLine.hasSwitch('debug'), true);
	resetSecurityCode();
	setState({ os: process.platform });
	setupFromCommandLineArgs(argv, app ? app.commandLine : null);
	logger.debug(`AppPath : ${state.appPath}`, { service });
	logger.debug(`DataPath : ${state.dataPath}`, { service });
	logger.debug(`ResourcePath : ${state.resourcePath}`, { service });
	logger.debug(`Electron ResourcePath : ${process.resourcesPath}`, { service });
	logger.debug(`INIT_CWD : ${process.env.INIT_CWD}`, { service });
	logger.debug(`PORTABLE_EXECUTABLE_DIR : ${process.env.PORTABLE_EXECUTABLE_DIR}`, { service });
	logger.debug(`app.getAppPath : ${app ? app.getAppPath() : undefined}`, { service });
	logger.debug(`argv: ${JSON.stringify(process.argv)}`, { service });
	logger.debug(`Locale : ${state.defaultLocale}`, { service });
	logger.debug(`OS : ${state.os}`, { service });
	await renameConfigKeys(argv).catch(() => {});
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
	console.log(logo);
	console.log('Karaoke Player & Manager - https://karaokes.moe');
	console.log(`Version ${state.version.number} "${state.version.name}" (${sha || 'UNKNOWN'})`);
	console.log('================================================================================');
	logger.debug('Initial state', { service, obj: state });

	await migrateReposToZip();
	// Checking paths, create them if needed.
	await checkPaths(getConfig());
	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	const tempInput = resolve(resolvedPath('Temp'), 'input.conf');
	logger.debug(`Copying input.conf to ${tempInput}`, { service });
	await copy(resolve(state.resourcePath, 'assets/input.conf'), tempInput);

	const bundledBackgrounds = resolvedPath('BundledBackgrounds');
	logger.debug(`Copying default backgrounds to ${bundledBackgrounds}`, { service });
	// Clear folder first
	const files = await fs.readdir(bundledBackgrounds);
	for (const file of files) {
		await fs.unlink(resolve(bundledBackgrounds, file)).catch(err => {
			logger.warn(`Could not remove background ${file}`, { service, obj: err });
		});
	}
	await copy(resolve(state.resourcePath, 'assets/backgrounds'), `${bundledBackgrounds}/`, { overwrite: true });

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`Copying blank.png to ${resolvedPath('Avatars')}`, { service });
	await copy(resolve(state.resourcePath, 'assets/blank.png'), resolve(resolvedPath('Avatars'), 'blank.png'));

	// Gentlemen, start your engines.
	try {
		await initEngine();
	} catch (err) {
		logger.error('Karaoke Mugen initialization failed', { service, obj: err });
		Sentry.error(err);
		console.log(err);
		errorStep(i18next.t('ERROR_UNKNOWN'));
		if (argv.opts().cli) exit(1);
	}
}

/* Checking if application paths exist. * */
async function checkPaths(config: Config) {
	try {
		// Emptying temp directory
		await remove(resolvedPath('Temp')).catch();
		await remove(resolvedPath('BundledBackgrounds')).catch();
		await remove(resolvedPath('Import')).catch();
		// Checking paths
		const checks = [];
		const dataPath = getState().dataPath;
		checks.push(asyncCheckOrMkdir(resolve(dataPath, 'logs/')));
		for (const repo of config.System.Repositories) {
			try {
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'karaokes')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'lyrics')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'tags')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'hooks')));
				for (const path of repo.Path.Medias) {
					await asyncCheckOrMkdir(resolve(dataPath, path));
				}
			} catch (err) {
				// If there's a problem with these folders, let's disable the repository.
				editRepo(repo.Name, {
					...repo,
					Enabled: false,
				});
				await dialog.showMessageBox(win, {
					title: i18next.t('REPO_DISABLED.TITLE'),
					message: i18next.t('REPO_DISABLED.MESSAGE', { repo: repo.Name }),
				});
			}
		}
		for (const type of backgroundTypes) {
			checks.push(asyncCheckOrMkdir(resolve(resolvedPath('Backgrounds'), type)));
		}
		for (const path of Object.keys(getConfig().System.Path)) {
			checks.push(asyncCheckOrMkdir(resolvedPath(path as PathType)));
		}
		await Promise.all(checks);
		logger.debug('Directory checks complete', { service });
	} catch (err) {
		errorStep(i18next.t('ERROR_INIT_PATHS'));
		throw err;
	}
}

async function verifyOpenPort(portConfig: number, firstRun: boolean) {
	try {
		const port = await getPortPromise({
			port: portConfig,
			stopPort: 7331,
		});
		setState({ frontendPort: port });
		if (port !== portConfig) {
			logger.warn(`Port ${portConfig} is already in use. Switching to ${port}`, { service });
			if (firstRun) {
				setConfig({ System: { FrontendPort: port } });
				logger.warn('This is first run, saving port configuration', { service });
			}
		}
	} catch (err) {
		throw new Error('Failed to find a free port to use');
	}
}

import { app, dialog } from 'electron';
import { promises as fs } from 'fs';
import { copy, remove } from 'fs-extra';
import i18next from 'i18next';
import { resolve } from 'path';
import { getPortPromise } from 'portfinder';

import { win } from '../electron/electron.js';
import { errorStep, initStep } from '../electron/electronLogger.js';
import { PathType } from '../lib/types/config.js';
import { configureLocale, getConfig, resolvedPath, setConfig } from '../lib/utils/config.js';
import { asyncCheckOrMkdir, fileExists } from '../lib/utils/files.js';
import logger, { configureLogger, profile } from '../lib/utils/logger.js';
import { resetNewAccountCode, resetSecurityCode } from '../services/auth.js';
import { backgroundTypes } from '../services/backgrounds.js';
import { editRepo } from '../services/repo.js';
import { Config } from '../types/config.js';
import { initConfig } from '../utils/config.js';
import { logo } from '../utils/constants.js';
import { defaultRepositories } from '../utils/defaultSettings.js';
import { updateKaraMoeRepoConfig, updateKaraMoeSecureConfig } from '../utils/hokutoNoCode.js';
import Sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { parseArgs, setupFromCommandLineArgs } from './args.js';
import { exit, initEngine } from './engine.js';

const service = 'Init';

// Commander call to get everything setup in argv
const argv = parseArgs();

async function getAppCommitSHA(): Promise<string> {
	// Set SHA commit hash. This is to display precise version number.
	let sha: string;
	const SHAFile = resolve(getState().resourcePath, 'assets/sha.txt');
	if (await fileExists(SHAFile)) {
		sha = (await fs.readFile(SHAFile, 'utf-8')).trimEnd();
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
	await configureLogger(argv.opts().verbose || app?.commandLine.hasSwitch('verbose'), true);
	profile('preInit');
	await configureLocale();
	resetSecurityCode();
	resetNewAccountCode();
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
	logger.debug(`OS : ${process.platform}`, { service });
	await initConfig(argv);
	// Set default repositories on First Run only
	const conf = getConfig();
	if (conf.System.Repositories.length === 0) {
		setConfig({ System: { Repositories: [...defaultRepositories] } });
	} else {
		updateKaraMoeRepoConfig();
		updateKaraMoeSecureConfig();
	}
	// Test if network ports are available
	await verifyOpenPort(getConfig().System.FrontendPort, getConfig().App.FirstRun);
	profile('preInit');
}

/** Initialize folders, paths and start the engine */
export async function init() {
	profile('Init');
	initStep(i18next.t('INIT_INIT'));
	// Set version number
	const sha = await getAppCommitSHA();
	const state = getState();
	console.log(logo);
	console.log('Karaoke Player & Manager - https://karaokes.moe');
	console.log(`Version ${state.version.number} "${state.version.name}" (${sha || 'UNKNOWN'})`);
	console.log('================================================================================');
	logger.debug('Initial state', { service, obj: state });

	// Checking paths, create them if needed.
	await checkPaths(getConfig());
	profile('copyBackgrounds');
	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	const tempInput = resolve(resolvedPath('Temp'), 'input.conf');
	logger.debug(`Copying input.conf to ${tempInput}`, { service });
	await copy(resolve(state.resourcePath, 'assets/input.conf'), tempInput);

	const bundledBackgrounds = resolvedPath('BundledBackgrounds');
	logger.debug(`Copying default backgrounds to ${bundledBackgrounds}`, { service });
	await copy(resolve(state.resourcePath, 'assets/backgrounds'), `${bundledBackgrounds}/`, { overwrite: true });

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`Copying blank.png to ${resolvedPath('Avatars')}`, { service });
	await copy(resolve(state.resourcePath, 'assets/blank.png'), resolve(resolvedPath('Avatars'), 'blank.png'));
	profile('copyBackgrounds');
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
	profile('Init');
}

/* Checking if application paths exist. * */
async function checkPaths(config: Config) {
	try {
		profile('checkPaths');
		await remove(resolvedPath('Temp')).catch();
		await remove(resolvedPath('Fonts')).catch();
		await remove(resolvedPath('BundledBackgrounds')).catch();
		await remove(resolvedPath('Import')).catch();
		// Checking paths
		const checks = [];
		const dataPath = getState().dataPath;
		checks.push(asyncCheckOrMkdir(resolvedPath('Temp')));
		checks.push(asyncCheckOrMkdir(resolvedPath('Fonts')));
		checks.push(asyncCheckOrMkdir(resolvedPath('Logs')));
		for (const repo of config.System.Repositories) {
			try {
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'karaokes')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'lyrics')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'tags')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'fonts')));
				checks.push(asyncCheckOrMkdir(resolve(dataPath, repo.BaseDir, 'hooks')));
				for (const path of repo.Path.Medias) {
					try {
						const mediaPath = resolve(dataPath, path);
						await asyncCheckOrMkdir(mediaPath);
					} catch (err) {
						logger.warn(`Media path ${path} for ${repo.Name} is not accessible`, { service, obj: err });
						if (path === repo.Path.Medias[0]) {
							logger.error(`Primary media path for ${repo.Name} is unreachable, disabling...`, {
								service,
							});
							throw err;
						}
					}
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
	} finally {
		profile('checkPaths');
	}
}

async function verifyOpenPort(portConfig: number, firstRun: boolean) {
	try {
		profile('verifyOpenPort');
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
	} finally {
		profile('verifyOpenPort');
	}
}

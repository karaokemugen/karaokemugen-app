// Manages Postgresql server binary

// Node modules
import execa from 'execa';
import { promises as fs } from 'fs';
import { mkdirp, remove } from 'fs-extra';
import i18next from 'i18next';
import {resolve} from 'path';
import semver from 'semver';
import {StringDecoder} from 'string_decoder';
import tasklist from 'tasklist';

import { errorStep } from '../electron/electronLogger';
import {getConfig, resolvedPathTemp} from '../lib/utils/config';
// KM Imports
import {asyncExists, asyncMove} from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { editSetting } from './config';
import { expectedPGVersion } from './constants';
import Downloader from './downloader';
import sentry from './sentry';
import {getState} from './state';

let shutdownInProgress = false;

/** Is postgreSQL being shutdown? */
export function isShutdownPG(): boolean {
	return shutdownInProgress;
}

/** Kill ALL pg process - windows only - handle with care */
async function killPG() {
	const state = getState();
	const conf = getConfig();
	if (state.os !== 'win32' || !conf.System.Database.bundledPostgresBinary) return;
	try {
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
		binPath = `"${binPath}"`;
		// Get task list
		const tasks = await tasklist();
		const PIDs = tasks.filter((t: any) => t.imageName === 'postgres.exe').map((t: any) => t.pid);
		for (const PID of PIDs) {
			const options = ['kill', 'TERM', PID];
			try {
				await execa(binPath, options, {
					cwd: state.binPath.postgres
				});
				logger.debug(`Killed PID ${PID}`, {service: 'DB'});
			} catch(err) {
				//Non fatal, proceed.
			}
		}
		try {
			const pgPIDFile = resolve(getState().dataPath, conf.System.Path.DB, 'postgres/postmaster.pid');
			await fs.unlink(pgPIDFile);
		} catch(err) {
			// Non fatal either. NOTHING IS FATAL, THIS FUNCTION IS LETHAL.
		}
		logger.debug('Processes killed', {service: 'DB'});
	} catch(err) {
		logger.error(`Unable to send kill signal : ${err}`, {service: 'DB'});
		sentry.error(err);
	}
}

/** Stop bundled postgreSQL server */
export async function stopPG() {
	shutdownInProgress = true;
	const state = getState();
	const conf = getConfig();
	const pgDataDir = resolve(getState().dataPath, conf.System.Path.DB, 'postgres');
	let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
	if (state.os === 'win32') binPath = `"${binPath}"`;
	const options = ['-D', pgDataDir, '-w', 'stop'];
	await execa(binPath, options, {
		cwd: state.binPath.postgres
	});
}

/** Get database PG version */
async function getPGVersion(): Promise<number> {
	const conf = getConfig();
	const pgDataDir = resolve(getState().dataPath, conf.System.Path.DB, 'postgres');
	try {
		const pgVersion = await fs.readFile(resolve(pgDataDir, 'PG_VERSION'), 'utf-8');
		return +pgVersion.split('\n')[0];
	} catch(err) {
		logger.error('Unable to determine PG version', {obj: err, service: 'DB'});
		throw err;
	}
}

/** Set a particular config value in bundled postgreSQL server config */
function setConfig(config: string, setting: string, value: any): string {
	const pgConfArr = config.split('\n');
	const found = pgConfArr.some(l => {
		return l.startsWith(`${setting}=`);
	});
	if (!found) {
		pgConfArr.push(`${setting}=${value}`);
	} else {
		for (const i in pgConfArr) {
			if (pgConfArr[i].startsWith(`${setting}=`)) pgConfArr[i] = `${setting}=${value}`;
		}
	}
	return pgConfArr.join('\n');
}

/** Dump postgreSQL database to file */
export async function dumpPG() {
	const conf = getConfig();
	const state = getState();
	if (!conf.System.Database.bundledPostgresBinary) {
		const err = 'Dump not available with hosted PostgreSQL servers';
		logger.warn(err, {service: 'DB'});
		throw err;
	}
	try {
		const options = ['-c','-E','UTF8','--if-exists','-U',conf.System.Database.username, '-p', `${conf.System.Database.port}`, '-f', resolve(state.dataPath, 'karaokemugen.sql'), conf.System.Database.database ];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_dump);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			stdio: 'inherit',
		});
		logger.info('Database dumped to file', {service: 'DB'});
	} catch(err) {
		if (err.stdout) sentry.addErrorInfo('stdout', err.stdout);
		if (err.stderr) sentry.addErrorInfo('stderr', err.stderr);
		logger.error('Database dump failed', {service: 'DB', obj: err});
		sentry.error(err);
		throw `Dump failed : ${err}`;
	}
}

/** Restore postgreSQL database from file */
export async function restorePG() {
	const conf = getConfig();
	const state = getState();
	if (!conf.System.Database.bundledPostgresBinary) {
		const err = 'Restore not available with hosted PostgreSQL servers';
		logger.warn(err, {service: 'DB'});
		throw err;
	}
	try {
		const options = ['-U', conf.System.Database.username, '-p', `${conf.System.Database.port}`, '-f', resolve(state.dataPath, 'karaokemugen.sql'), conf.System.Database.database];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_client);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			stdio: 'inherit'
		});
		logger.info('Database restored from file', {service: 'DB'});
	} catch(err) {
		if (err.stdout) sentry.addErrorInfo('stdout', err.stdout);
		if (err.stderr) sentry.addErrorInfo('stderr', err.stderr);
		sentry.error(err);
		logger.error('Database restoration failed', {service: 'DB', obj: err});
		throw `Restore failed : ${err}`;
	}
}

/** 	ialize postgreSQL data directory if it doesn't exist */
export async function initPGData() {
	const asciiRegex = /^[\u0000-\u007F]+$/u;
	const conf = getConfig();
	const state = getState();
	logger.info('No database present, initializing a new one...', {service: 'DB'});
	try {
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
		let tempPGPath: string;
		// We remove the bin part because we might need to use pgPath to move the whole postgres binary directory away.
		// Postgres pg_init doesn't like having non-ASCII characters in its path
		// So if it has, we'll move the whole pg distro out of the way in the OS temp directory
		// This is a bug postgres doesn't intend to fix because it's windows only
		// /shrug
		//
		const pgPath = resolve(state.appPath, state.binPath.postgres).replace(/\\bin$/g,'').replace(/\/bin$/, '');
		if (!asciiRegex.test(binPath) && state.os === 'win32') {
			logger.warn('Binaries path is in a non-ASCII path, will copy it to the OS\'s temp folder first to init database', {service: 'DB'});
			// On Windows, tmpdir() returns the user home directory/appData/local/temp so it's pretty useless, we'll try writing to C:\KaraokeMugenPostgres. If it fails because of permissions, there's not much else we can do, sadly.
			tempPGPath = resolve('C:\\', 'KaraokeMugenPostgres');
			logger.info(`Moving ${pgPath} to ${tempPGPath}`, {service: 'DB'});
			await remove(tempPGPath).catch(() => {}); //izok
			await mkdirp(tempPGPath);
			await asyncMove(pgPath, resolve(tempPGPath, 'postgres'));
			binPath = resolve(tempPGPath, 'postgres', 'bin', 'pg_ctl.exe');
			logger.debug(`pg binPath: ${binPath}`, {service: 'DB'});
		}
		const options = [ 'init', '-o', `-U ${conf.System.Database.superuser} -E UTF8`, '-D', resolve(state.dataPath, conf.System.Path.DB, 'postgres/') ];
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: tempPGPath ? resolve(tempPGPath, 'postgres', 'bin') : resolve(state.appPath, state.binPath.postgres),
			stdio: 'inherit',
		});
		if (tempPGPath) {
			await editSetting({
				System: {
					Binaries: {
						Postgres: {
							Windows: resolve(tempPGPath, 'postgres', 'bin')
						}
					}
				}
			});
		}
	} catch(err) {
		if (err.stdout) sentry.addErrorInfo('stdout', err.stdout);
		if (err.stderr) sentry.addErrorInfo('stderr', err.stderr);
		sentry.error(err);
		logger.error('Failed to initialize database', {service: 'DB', obj: err});
		const decoder = new StringDecoder(state.os === 'win32' ? 'latin1' : 'utf8');
		logger.error('PostgreSQL error', {service: 'DB', obj: decoder.write(err.stderr)});
		errorStep(i18next.t('ERROR_INIT_PG_DATA'));
		throw `Init failed : ${err}`;
	}
}

/** Update postgreSQL configuration */
export async function updatePGConf() {
	// Editing port and other important settings in postgresql.conf
	const conf = getConfig();
	const state = getState();
	const pgConfFile = resolve(state.dataPath, conf.System.Path.DB, 'postgres/postgresql.conf');
	let pgConf = await fs.readFile(pgConfFile, 'utf-8');
	//Parsing the ini file by hand since it can't be parsed well with ini package
	pgConf = setConfig(pgConf, 'port', conf.System.Database.port);
	pgConf = setConfig(pgConf, 'logging_collector', 'on');
	state.opt.sql
		? pgConf = setConfig(pgConf, 'log_statement', '\'all\'')
		: pgConf = setConfig(pgConf, 'log_statement', '\'none\'');
	pgConf = setConfig(pgConf, 'synchronous_commit', 'off');
	await fs.writeFile(pgConfFile, pgConf, 'utf-8');
}

/** Check if bundled postgreSQL is running or not. It won't launch another one if it's already running, and will instead connect to it. */
export async function checkPG(): Promise<boolean> {
	const conf = getConfig();
	const state = getState();
	if (!conf.System.Database.bundledPostgresBinary) return false;
	try {
		const options = ['status', '-D', resolve(state.dataPath, conf.System.Path.DB, 'postgres/') ];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres)
		});
		logger.debug('Postgresql is running', {service: 'DB'});
		return true;
	} catch(err) {
		// Status sends an exit code of 3 if postgresql is not running
		// It gets thrown here so we return false (not running).
		logger.debug('Postgresql is NOT running', {service: 'DB'});
		return false;
	}
}

/** Initialize bundled PostgreSQL server and data if necessary */
export async function initPG(relaunch = true) {
	const conf = getConfig();
	const state = getState();
	if (state.os === 'win32') await checkAndInstallVCRedist();
	const pgDataDir = resolve(state.dataPath, conf.System.Path.DB, 'postgres');
	// If no data dir is present, we're going to init one
	if (!await asyncExists(pgDataDir)) await initPGData();
	// Try to check if PG is running by conventionnal means.
	if (await checkPG()) return true;
	logger.info('Launching bundled PostgreSQL', {service: 'DB'});
	await updatePGConf();
	const options = ['-w','-D',`${pgDataDir}`,'start'];
	let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
	if (state.os === 'win32') binPath = `"${binPath}"`;
	// We set all stdios on ignore or inherit since pg_ctl requires a TTY terminal and will hang if we don't do that
	const pgBinDir = resolve(state.appPath, state.binPath.postgres);
	try {
		const pgVersion = await getPGVersion();
		if (pgVersion !== expectedPGVersion) throw `Incorrect PostgreSQL version detected. Expected ${expectedPGVersion}, got ${pgVersion}`;
	} catch(err) {
		errorStep(i18next.t('ERROR_START_PG'));
		throw err;
	}
	try {
		await execa(binPath, options, {
			cwd: pgBinDir,
			stdio: 'ignore',
		});
		return true;
	} catch(err) {
		logger.error('Failed to start PostgreSQL', {service: 'DB', obj: err});
		// First let's try to kill PG if it's already running
		if (relaunch) {
			try {
				await killPG();
			} catch(err) {
				//It should be fatal, but even if it does abort, let's try to launch again.
			}
			// Let's try to relaunch. If it returns true this time, return directly. If not continue to try to pinpoint the error message
			if (await initPG(false)) return;
		}
		// We're going to try launching it directly to get THE error.
		const pgBinExe = state.os === 'win32'
			? 'postgres.exe'
			: 'postgres';
		const pgBinPath = `"${resolve(pgBinDir, pgBinExe)}"`;
		const pgBinOptions = ['-D',`${pgDataDir}`];
		try {
			await execa(pgBinPath, pgBinOptions, {
				cwd: pgBinDir,
				encoding: null
			});
		} catch(err) {
			// Postgres usually sends its content in non-unicode format under Windows. Go figure.
			const decoder = new StringDecoder(state.os === 'win32' ? 'latin1' : 'utf8');
			logger.error('PostgreSQL error', {service: 'DB', obj: decoder.write(err.stderr)});
		}
		errorStep(i18next.t('ERROR_START_PG'));
		throw err.message;
	}
}

/** Check Windows' VCRedist presence since we need it for postgresql */
export async function checkAndInstallVCRedist() {
	try {
		const checks = {
			2015: {
				file: resolve('C:/Windows/System32/VCRUNTIME140.DLL'),
				URL: 'https://mugen.karaokes.moe/downloads/vcredist2015_x64.exe'
			},
			2012: {
				file: resolve('C:/Windows/System32/msvcr120.dll'),
				URL: 'https://mugen.karaokes.moe/downloads/vcredist_x64.exe'
			}
		};
		const check = semver.satisfies(getState().version.number.split('-')[0], '>=6.0.0')
			? checks[2015]
			: checks[2012];
		if (await asyncExists(check.file)) return;
		// Let's download VC Redist and install it yo.
		logger.warn('Visual C++ Redistribuable not found, downloading and installing.', {service: 'Postgres'});
		const downloader = new Downloader({task: null});
		// Launch downloads
		const vcRedistPath = resolve(resolvedPathTemp(), 'vcredist.exe');
		const fileErrors = await downloader.download([
			{
				url: check.URL,
				filename: vcRedistPath
			}
		]);
		if (fileErrors.length > 0) throw fileErrors;
		await execa(vcRedistPath, null, {
			windowsHide: false
		});
	} catch(err) {
		logger.error('Installation of Visual C++ Redistribuable 2015 failed', {service: 'Postgres', obj: err});
		throw err;
	}
}
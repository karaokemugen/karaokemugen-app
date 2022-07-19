// Manages Postgresql server binary

// Node modules
import { execa } from 'execa';
import { promises as fs } from 'fs';
import { mkdirp, remove } from 'fs-extra';
import i18next from 'i18next';
import { resolve } from 'path';
import { StringDecoder } from 'string_decoder';
import { tasklist } from 'tasklist';

import { errorStep } from '../electron/electronLogger';
import { getConfig, resolvedPath } from '../lib/utils/config';
import { asciiRegexp } from '../lib/utils/constants';
import { downloadFile } from '../lib/utils/downloader';
// KM Imports
import { compressGzipFile, decompressGzipFile, fileExists, smartMove } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { PGVersion } from '../types/database';
import { checkBinaries, editSetting } from './config';
import { expectedPGVersion, pgctlRegex } from './constants';
import sentry from './sentry';
import { getState, setState } from './state';

const service = 'Postgres';

let shutdownInProgress = false;

/** Is postgreSQL being shutdown? */
export function isShutdownPG(): boolean {
	return shutdownInProgress;
}

function determineEnv() {
	const env = { ...process.env };
	const state = getState();
	if (process.platform === 'linux') {
		env.LD_LIBRARY_PATH = resolve(state.appPath, state.binPath.postgres, '../lib/');
		env.LC_ALL = 'en_US.UTF-8';
	}
	return env;
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
					cwd: state.binPath.postgres,
					env: determineEnv(),
				});
				logger.debug(`Killed PID ${PID}`, { service });
			} catch (err) {
				// Non fatal, proceed.
			}
		}
		try {
			const pgPIDFile = resolve(getState().dataPath, conf.System.Path.DB, 'postgres/postmaster.pid');
			await fs.unlink(pgPIDFile);
		} catch (err) {
			// Non fatal either. NOTHING IS FATAL, THIS FUNCTION IS LETHAL.
		}
		logger.debug('Processes killed', { service });
	} catch (err) {
		logger.error(`Unable to send kill signal : ${err}`, { service });
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
		cwd: state.binPath.postgres,
		env: determineEnv(),
	});
}

/** Get database PG version */
async function getPGVersion(): Promise<PGVersion> {
	const conf = getConfig();
	const pgDataDir = resolve(getState().dataPath, conf.System.Path.DB, 'postgres');
	try {
		const dataVersionFile = await fs.readFile(resolve(pgDataDir, 'PG_VERSION'), 'utf-8');
		const dataVersion = dataVersionFile.split('\n')[0];
		const state = getState();
		await detectPGBinPath();
		const pgctlPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
		const output = await execa(pgctlPath, ['--version'], {
			env: determineEnv(),
		});
		logger.debug(`pg_ctl stdout: ${output.stdout}`, { service });
		const binVersion = pgctlRegex.exec(output.stdout)[1].split('.')[0];
		return {
			bin: +binVersion,
			data: +dataVersion,
		};
	} catch (err) {
		logger.error('Unable to determine PG version', { obj: err, service });
		throw err;
	}
}

/** Set a particular config value in bundled postgreSQL server config */
function setConfig(config: string, setting: string, value: any): string {
	const pgConfArr = config.split('\n');
	const found = pgConfArr.some(l => l.startsWith(`${setting}=`));
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
		logger.warn(err, { service });
		throw err;
	}
	logger.info('Dumping database...', { service });
	const dumpFile = resolve(state.dataPath, 'karaokemugen.sql');
	try {
		const options = [
			'-c',
			'-E',
			'UTF8',
			'--if-exists',
			'-U',
			conf.System.Database.username,
			'-p',
			`${conf.System.Database.port}`,
			'-f',
			dumpFile,
			conf.System.Database.database,
		];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_dump);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			env: determineEnv(),
		});
		await compressGzipFile(dumpFile);
		await fs.unlink(dumpFile);
		logger.info('Database dumped to file', { service });
	} catch (err) {
		if (err.stdout) sentry.addErrorInfo('stdout', err.stdout);
		if (err.stderr) sentry.addErrorInfo('stderr', err.stderr);
		logger.error('Database dump failed', { service, obj: err });
		sentry.error(err);
		throw `Dump failed : ${err}`;
	}
}

/** Restore postgreSQL database from file */
export async function restorePG() {
	const conf = getConfig();
	const state = getState();
	const compressedDumpFile = resolve(state.dataPath, 'karaokemugen.sql.gz');
	if (!conf.System.Database.bundledPostgresBinary) {
		const err = 'Restore not available with hosted PostgreSQL servers';
		logger.warn(err, { service });
		throw err;
	}
	try {
		const dumpFile = await decompressGzipFile(compressedDumpFile);
		const options = [
			'-U',
			conf.System.Database.username,
			'-p',
			`${conf.System.Database.port}`,
			'-f',
			dumpFile,
			conf.System.Database.database,
		];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_client);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		logger.info('Restoring dump to database...', { service });
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			env: determineEnv(),
		});
		await fs.unlink(dumpFile);
		logger.info('Database restored from file', { service });
	} catch (err) {
		if (err.stdout) sentry.addErrorInfo('stdout', err.stdout);
		if (err.stderr) sentry.addErrorInfo('stderr', err.stderr);
		sentry.error(err);
		logger.error('Database restoration failed', { service, obj: err });
		throw `Restore failed : ${err}`;
	}
}

async function detectPGBinPath(): Promise<string> {
	const state = getState();
	let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
	let tempPGPath: string;
	// We remove the bin part because we might need to use pgPath to move the whole postgres binary directory away.
	// Postgres pg_init doesn't like having non-ASCII characters in its path
	// So if it has, we'll move the whole pg distro out of the way in the OS temp directory
	// This is a bug postgres doesn't intend to fix because it's windows only
	// /shrug
	//
	const pgPath = resolve(state.appPath, state.binPath.postgres)
		.replace(/\\bin$/g, '')
		.replace(/\/bin$/, '');
	if (!asciiRegexp.test(binPath) && state.os === 'win32') {
		logger.warn(
			"Binaries path is in a non-ASCII path, will copy it to the OS's temp folder first to init database",
			{ service }
		);
		// On Windows, tmpdir() returns the user home directory/appData/local/temp so it's pretty useless, we'll try writing to C:\KaraokeMugenPostgres. If it fails because of permissions, there's not much else we can do, sadly.
		tempPGPath = resolve('C:\\', 'KaraokeMugenPostgres');
		logger.info(`Moving ${pgPath} to ${tempPGPath}`, { service });
		await remove(tempPGPath).catch(() => {}); // izok
		await mkdirp(tempPGPath);
		await smartMove(pgPath, resolve(tempPGPath, 'postgres'));
		binPath = resolve(tempPGPath, 'postgres', 'bin', 'pg_ctl.exe');
		logger.debug(`pg binPath: ${binPath}`, { service });
	}
	if (tempPGPath) {
		// Path has changed, let's update settings and state
		await editSetting({
			System: {
				Binaries: {
					Postgres: {
						Windows: resolve(tempPGPath, 'postgres', 'bin'),
					},
				},
			},
		});
		await checkBinaries(getConfig());
	}
	return binPath;
}

/** Initialize postgreSQL data directory if it doesn't exist */
export async function initPGData() {
	const conf = getConfig();
	logger.info('No database present, initializing a new one...', { service });
	try {
		let binPath = await detectPGBinPath();
		const state = getState();
		const options = [
			'init',
			'-o',
			`-U ${conf.System.Database.superuser} -E UTF8`,
			'-D',
			resolve(state.dataPath, conf.System.Path.DB, 'postgres/'),
		];
		if (state.os === 'win32') binPath = `"${binPath}"`;
		logger.info('ENV', { service, obj: determineEnv() });
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			stdio: 'inherit',
			env: determineEnv(),
		});
	} catch (err) {
		if (err.stdout) sentry.addErrorInfo('stdout', err.stdout);
		if (err.stderr) sentry.addErrorInfo('stderr', err.stderr);
		sentry.error(err);
		logger.error('Failed to initialize database', { service, obj: err });
		const decoder = new StringDecoder(getState().os === 'win32' ? 'latin1' : 'utf8');
		logger.error('PostgreSQL error', { service, obj: decoder.write(err.stderr) });
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
	// Parsing the ini file by hand since it can't be parsed well with ini package
	pgConf = setConfig(pgConf, 'port', conf.System.Database.port);
	pgConf = setConfig(pgConf, 'logging_collector', 'on');
	state.opt.sql
		? (pgConf = setConfig(pgConf, 'log_statement', "'all'"))
		: (pgConf = setConfig(pgConf, 'log_statement', "'none'"));
	pgConf = setConfig(pgConf, 'synchronous_commit', 'off');
	await fs.writeFile(pgConfFile, pgConf, 'utf-8');
}

/** Check if bundled postgreSQL is running or not. It won't launch another one if it's already running, and will instead connect to it. */
export async function checkPG(): Promise<boolean> {
	const conf = getConfig();
	const state = getState();
	if (!conf.System.Database.bundledPostgresBinary) return false;
	try {
		const options = ['status', '-D', resolve(state.dataPath, conf.System.Path.DB, 'postgres/')];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			env: determineEnv(),
		});
		logger.debug('Postgresql is running', { service });
		return true;
	} catch (err) {
		// Status sends an exit code of 3 if postgresql is not running
		// It gets thrown here so we return false (not running).
		logger.debug('Postgresql is NOT running', { service });
		return false;
	}
}

/** Initialize bundled PostgreSQL server and data if necessary */
export async function initPG(relaunch = true) {
	let conf = getConfig();
	let state = getState();
	// Sometime this fails and doesn't detect VCRedist's absence.
	if (state.os === 'win32') await checkAndInstallVCRedist();
	const pgDataDir = resolve(state.dataPath, conf.System.Path.DB, 'postgres');
	// If no data dir is present, we're going to init one
	if (!(await fileExists(resolve(pgDataDir, 'PG_VERSION')))) {
		// Simple, beautiful.
		await initPGData();
	} else {
		// Check data dir version to see if it's the one we expect.
		const versions = await getPGVersion();
		// Reload state and conf
		state = getState();
		conf = getConfig();
		if (versions.bin < expectedPGVersion) {
			// Your PostgreSQL needs an upgrade!
			logger.warn(`Incorrect PostgreSQL version detected. Expected ${expectedPGVersion}, got ${versions.bin}. `, {
				service,
			});
		}
		if (versions.data !== versions.bin) {
			logger.warn(
				`Incorrect PostgreSQL database data version detected. Expected ${versions.bin}, got ${versions.data}. `,
				{ service }
			);
			logger.info(`Migrating data to PostgreSQL ${versions.bin}... `, { service });
			// You never know.
			if (await checkPG()) await stopPG();
			// we'll need to move the directory to another name just to make sure, and restore a dump after PG has started.
			const backupPGDir = resolve(state.dataPath, conf.System.Path.DB, `postgres${versions.data}`);
			// Remove folder before renaming the old one.
			await fs.rm(backupPGDir, { recursive: true, force: true }).catch(() => {});
			await fs.rename(pgDataDir, backupPGDir);
			await initPGData();
			// Restore is done once KM is connected to the database.
			setState({ restoreNeeded: true });
		}
	}
	// Try to check if PG is running by conventionnal means.
	if (await checkPG()) return true;
	logger.info('Launching bundled PostgreSQL', { service });
	await updatePGConf();
	const options = ['-w', '-D', `${pgDataDir}`, 'start'];
	let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
	if (state.os === 'win32') binPath = `"${binPath}"`;
	// We set all stdios on ignore or inherit since pg_ctl requires a TTY terminal and will hang if we don't do that
	const pgBinDir = resolve(state.appPath, state.binPath.postgres);
	try {
		await execa(binPath, options, {
			cwd: pgBinDir,
			stdio: 'ignore',
			env: determineEnv(),
		});
		return true;
	} catch (err) {
		logger.error('Failed to start PostgreSQL', { service, obj: err });
		// First let's try to kill PG if it's already running
		if (relaunch) {
			try {
				await killPG();
			} catch (err2) {
				// It should be fatal, but even if it does abort, let's try to launch again.
			}
			// Let's try to relaunch. If it returns true this time, return directly. If not continue to try to pinpoint the error message
			if (await initPG(false)) return;
		}
		// We're going to try launching it directly to get THE error.
		const pgBinExe = state.os === 'win32' ? 'postgres.exe' : 'postgres';
		const pgBinPath = `"${resolve(pgBinDir, pgBinExe)}"`;
		const pgBinOptions = ['-D', `${pgDataDir}`];
		try {
			await execa(pgBinPath, pgBinOptions, {
				cwd: pgBinDir,
				encoding: null,
				env: determineEnv(),
			});
		} catch (err2) {
			// Postgres usually sends its content in non-unicode format under Windows. Go figure.
			const decoder = new StringDecoder(state.os === 'win32' ? 'latin1' : 'utf8');
			logger.error('PostgreSQL error', { service, obj: decoder.write(err2.stderr) });
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
				file: resolve('C:/Windows/System32/vcruntime140.dll'),
				URL: 'https://mugen.karaokes.moe/downloads/vcredist2015_x64.exe',
			},
			// Remove 2012 in KM 7.0
			2012: {
				file: resolve('C:/Windows/System32/msvcr120.dll'),
				URL: 'https://mugen.karaokes.moe/downloads/vcredist_x64.exe',
			},
		};
		const check = expectedPGVersion > 10 ? checks[2015] : checks[2012];
		if (await fileExists(check.file)) return;
		// Let's download VC Redist and install it yo.
		logger.warn('Visual C++ Redistribuable not found, downloading and installing.', { service });
		// Launch downloads
		const vcRedistPath = resolve(resolvedPath('Temp'), 'vcredist.exe');
		await downloadFile({
			url: check.URL,
			filename: vcRedistPath,
		});
		await execa(vcRedistPath, null, {
			windowsHide: false,
		});
	} catch (err) {
		logger.error('Installation of Visual C++ Redistribuable 2015 failed', { service, obj: err });
		throw err;
	}
}

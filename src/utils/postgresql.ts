// Manages Postgresql server binary

import execa from 'execa';
import {resolve} from 'path';
import {asyncExists, asyncWriteFile, asyncReadFile} from '../lib/utils/files';
import {getConfig} from '../lib/utils/config';
import {getState} from './state';
import logger from '../lib/utils/logger';

let shutdownInProgress = false;

/** Is postgreSQL being shutdown? */
export function isShutdownPG(): boolean {
	return shutdownInProgress;
}

/** Kill bundled postgreSQL server */
export async function killPG() {
	shutdownInProgress = true;
	const state = getState();
	const conf = getConfig();
	const pgDataDir = resolve(getState().appPath, conf.System.Path.DB, 'postgres');
	let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
	if (state.os === 'win32') binPath = `"${binPath}"`;
	return await execa(binPath, ['-D', pgDataDir, '-w', 'stop'], {
		cwd: state.binPath.postgres
	});
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
		};
	}
	return pgConfArr.join('\n');
}

/** Dump postgreSQL database to file */
export async function dumpPG() {
	const conf = getConfig();
	const state = getState();
	try {
		const options = ['-c','-E','UTF8','--if-exists','-U',conf.Database.prod.user, '-p', `${conf.Database.prod.port}`, '-f', resolve(state.appPath, 'karaokemugen.sql'), conf.Database.prod.database ];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_dump);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres)
		});
		logger.info('[DB] Database dumped to file');
	} catch(err) {
		throw `Dump failed : ${err}`;
	}
}

/** Restore postgreSQL database from file */
export async function restorePG() {
	const conf = getConfig();
	const state = getState();
	try {
		const options = ['-U', conf.Database.prod.user, '-p', `${conf.Database.prod.port}`, '-f', resolve(state.appPath, 'karaokemugen.sql'), conf.Database.prod.database];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_client);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			stdio: 'inherit'
		});
		logger.info('[DB] Database restored from file');
	} catch(err) {
		logger.error(`[DB] Database restoration failed : ${err}`);
		throw `Restore failed : ${err}`;
	}
}

/** Initialize postgreSQL data directory if it doesn't exist */
export async function initPGData() {
	const conf = getConfig();
	const state = getState();
	logger.info('[DB] No database present, initializing a new one...');
	try {
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);;
		const options = [ 'init','-o', `-U ${conf.Database.prod.superuser} -E UTF8`, '-D', resolve(state.appPath, conf.System.Path.DB, 'postgres/') ];
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			stdio: 'inherit'
		});
	} catch(err) {
		logger.error(`[DB] Failed to initialize database : ${JSON.stringify(err, null, 2)}`);
		throw `Init failed : ${err}`;
	}
}

/** Update postgreSQL configuration */
export async function updatePGConf() {
	// Editing port in postgresql.conf
	const conf = getConfig();
	const state = getState();
	const pgConfFile = resolve(state.appPath, conf.System.Path.DB, 'postgres/postgresql.conf');
	let pgConf = await asyncReadFile(pgConfFile, 'utf-8');
	//Parsing the ini file by hand since it can't be parsed well with ini package
	pgConf = setConfig(pgConf, 'port', conf.Database.prod.port);
	pgConf = setConfig(pgConf, 'logging_collector', 'on');
	pgConf = setConfig(pgConf, 'log_directory', `'${resolve(state.appPath, 'logs/').replace(/\\/g,'/')}'`);
	pgConf = setConfig(pgConf, 'log_filename', '\'postgresql-%Y-%m-%d.log\'');
	state.opt.sql
		? pgConf = setConfig(pgConf, 'log_statement', '\'all\'')
		: pgConf = setConfig(pgConf, 'log_statement', '\'none\'');
	pgConf = setConfig(pgConf, 'synchronous_commit', 'off');
	await asyncWriteFile(pgConfFile, pgConf, 'utf-8');
}

/** Check if bundled postgreSQL is running or not. It won't launch another one if it's already running, and will instead connect to it. */
export async function checkPG() {
	const conf = getConfig();
	const state = getState();
	if (!conf.Database.prod.bundledPostgresBinary) return false;
	try {
		const options = ['status', '-D', resolve(state.appPath, conf.System.Path.DB, 'postgres/') ];
		let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
		if (state.os === 'win32') binPath = `"${binPath}"`;
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres)
		});
		return true;
	} catch(err) {
		// Status sends an exit code of 3 if postgresql is not running
		// It gets thrown here so we return false (not running).
		return false;
	}
}

/** Initialize bundled PostgreSQL server and data if necessary */
export async function initPG() {
	const conf = getConfig();
	const state = getState();
	const pgDataDir = resolve(state.appPath, conf.System.Path.DB, 'postgres');
	// If no data dir is present, we're going to init one
	if (!await asyncExists(pgDataDir)) await initPGData();
	if (await checkPG()) {
		logger.info('[DB] Bundled PostgreSQL is already running');
		return true;
	}
	logger.info('[DB] Launching bundled PostgreSQL');
	await updatePGConf();
	const options = ['-w','-D',`${pgDataDir}`,'start'];
	let binPath = resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl);
	if (state.os === 'win32') binPath = `"${binPath}"`;
	// We set all stdios on ignore or inherit since pg_ctl requires a TTY terminal and will hang if we don't do that
	try {
		await execa(binPath, options, {
			cwd: resolve(state.appPath, state.binPath.postgres),
			stdio: 'ignore'
		});
	} catch(err) {
		logger.error(`[DB] Failed to start PostgreSQL : ${JSON.stringify(err, null, 2)}`);
		throw err.message;
	}
}


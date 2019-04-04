// Manages Postgresql server binary

import execa from 'execa';
import {resolve} from 'path';
import {asyncExists, asyncWriteFile, asyncReadFile} from './files';
import {getConfig} from './config';
import {getState} from './state';
import logger from 'winston';

let shutdownInProgress = false;

export function isShutdownPG() {
	return shutdownInProgress;
}

export async function killPG() {
	shutdownInProgress = true;
	const state = getState();
	const conf = getConfig();
	const pgDataDir = resolve(resolve(getState().appPath, conf.System.Path.DB, 'postgres'));
	return await execa(resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl), ['-D', pgDataDir, '-w', 'stop'], {
		cwd: resolve(state.appPath, state.binPath.postgres)
	});
}

function setConfig(config, setting, value) {
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

export async function dumpPG() {
	const conf = getConfig();
	const state = getState();
	try {
		const options = `-c -E UTF8 --if-exists -U ${conf.Database.prod.user} -p ${conf.Database.prod.port} -f ${resolve(state.appPath, 'karaokemugen.pgdump')} ${conf.Database.prod.database}`;
		await execa(resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_dump), options.split(' '), {
			cwd: resolve(state.appPath, state.binPath.postgres)
		});
	} catch(err) {
		throw `Dump failed : ${err}`;
	}
}

export async function initPGData() {
	const conf = getConfig();
	const state = getState();
	logger.info('[DB] No database present, initializing a new one...');
	try {
		if (state.os !== 'win32') {
			const options = [ 'init','-o', `-U ${conf.Database.prod.superuser} -E UTF8`, '-D', resolve(state.appPath, conf.System.Path.DB, 'postgres/') ];
			await execa(resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl), options, {
				cwd: resolve(state.appPath, state.binPath.postgres),
				stdio: 'inherit'
			});
		} else {
			const options = `init -o "-U ${conf.Database.prod.superuser} -E UTF8" -D ${resolve(state.appPath, conf.System.Path.DB, 'postgres/')}`;
			await execa(resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl), options.split(' '), {
				cwd: resolve(state.appPath, state.binPath.postgres),
				windowsVerbatimArguments: true,
				stdio: 'inherit'
			});
		}
	} catch(err) {
		throw `Init failed : ${err}`;
	}
}


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

export async function checkPG() {
	const conf = getConfig();
	const state = getState();
	if (!conf.Database.prod.bundledPostgresBinary) return false;
	try {
		const options = `status -D ${resolve(state.appPath, conf.System.Path.DB, 'postgres/')}`;
		await execa(resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl), options.split(' '), {
			cwd: resolve(state.appPath, state.binPath.postgres)
		});
		return true;
	} catch(err) {
		// Status sends an exit code of 3 if postgresql is not running
		// It gets thrown here so we return false (not running).
		return false;
	}
}

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
	const options = `-w -D ${pgDataDir} start`;
	// We set all stdios on ignore since pg_ctl requires a TTY terminal and will hang if we don't do that
	await execa(resolve(state.appPath, state.binPath.postgres, state.binPath.postgres_ctl), options.split(' '), {
		cwd: resolve(state.appPath, state.binPath.postgres),
		stdio: ['ignore','ignore','ignore']
	});
}


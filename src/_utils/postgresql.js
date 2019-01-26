// Manages Postgresql server binary

import execa from 'execa';
import {resolve} from 'path';
import {asyncExists, asyncWriteFile, asyncReadFile} from './files';
import {getConfig} from './config';
import logger from 'winston';

let shutdownInProgress = false;

export function isShutdownPG() {
	return shutdownInProgress;
}

export async function killPG() {
	shutdownInProgress = true;
	const conf = getConfig();
	const pgDataDir = resolve(resolve(conf.appPath, conf.PathDB, 'postgres'));
	return await execa(resolve(conf.BinPostgresPath, conf.BinPostgresCTLExe), ['-D', pgDataDir, '-w', 'stop'], {
		cwd: resolve(conf.appPath, conf.BinPostgresPath)
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
	try {
		const options = `init -c -E UTF8 --if-exists -U ${conf.db.prod.user} -p ${conf.db.prod.port} -f ${resolve(conf.appPath, 'karaokemugen.pgdump')} ${conf.db.prod.database}`;
		await execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresDumpExe), options.split(' '), {
			cwd: resolve(conf.appPath, conf.BinPostgresPath)
		});
	} catch(err) {
		throw `Dump failed : ${err}`;
	}
}

export async function initPGData() {
	const conf = getConfig();
	logger.info('[DB] No database present, initializing a new one...');
	try {
		const options = [ 'init','-o', `-U ${conf.db.prod.superuser} -E UTF8`, '-D', resolve(conf.appPath, conf.PathDB, 'postgres/') ];
		await execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresCTLExe), options, {
			cwd: resolve(conf.appPath, conf.BinPostgresPath),
			windowsVerbatimArguments: true,
			stdio: 'inherit'
		});
	} catch(err) {
		throw `Init failed : ${err}`;
	}
}


export async function updatePGConf() {
	// Editing port in postgresql.conf
	const conf = getConfig();
	const pgConfFile = resolve(conf.appPath, conf.PathDB, 'postgres/postgresql.conf');
	let pgConf = await asyncReadFile(pgConfFile, 'utf-8');
	//Parsing the ini file by hand since it can't be parsed well with ini package
	pgConf = setConfig(pgConf, 'port', conf.db.prod.port);
	pgConf = setConfig(pgConf, 'logging_collector', 'on');
	pgConf = setConfig(pgConf, 'log_directory', `'${resolve(conf.appPath, 'logs/').replace(/\\/g,'/')}'`);
	pgConf = setConfig(pgConf, 'log_filename', '\'postgresql-%Y-%m-%d.log\'');
	pgConf = setConfig(pgConf, 'log_statement', '\'all\'');
	pgConf = setConfig(pgConf, 'synchronous_commit', 'off');
	await asyncWriteFile(pgConfFile, pgConf, 'utf-8');
}

export async function checkPG() {
	const conf = getConfig();
	if (!conf.db.prod.bundledPostgresBinary) return false;
	// Status sends an exit code of 3 if postgresql is not running
	// So it's thrown.
	try {
		const options = `status -D ${resolve(conf.appPath, conf.PathDB, 'postgres/')}`;
		await execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresCTLExe), options.split(' '), {
			cwd: resolve(conf.appPath, conf.BinPostgresPath)
		});
		return true;
	} catch(err) {
		return false;
	}
}

export async function initPG() {
	const conf = getConfig();
	const pgDataDir = resolve(conf.appPath, conf.PathDB, 'postgres');
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
	await execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresCTLExe), options.split(' '), {
		cwd: resolve(conf.appPath, conf.BinPostgresPath),
		stdio: ['ignore','ignore','ignore']
	});
}


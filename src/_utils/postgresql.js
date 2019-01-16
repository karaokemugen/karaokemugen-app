// Manages Postgresql server binary

import execa from 'execa';
import {resolve} from 'path';
import {watch} from 'chokidar';
import {asyncExists, asyncWriteFile, asyncReadFile} from './files';
import {getConfig} from './config';
import {emit} from './pubsub';
import logger from 'winston';

let started = false;

export function checkPG() {
	return started;
}

export async function killPG() {
	const conf = getConfig();
	const pgDataDir = resolve(resolve(conf.appPath, conf.PathDB, 'postgres'));
	emit('postgresShutdownInProgress');
	return await execa(resolve(conf.BinPostgresPath, conf.BinPostgresCTLExe), ['-D', pgDataDir,'stop'], {
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
		await execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresDumpExe), [ '-U', conf.db.prod.user, '-p', conf.db.prod.port, '-f', resolve(conf.appPath, 'karaokemugen.pgdump') , conf.db.prod.database ], {
			cwd: resolve(conf.appPath, conf.BinPostgresPath)
		});
	} catch(err) {
		throw `Dump failed : ${err}`;
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
	await asyncWriteFile(pgConfFile, pgConf, 'utf-8');
}

async function checkPIDFile(pidFile) {
	if (!await asyncExists(pidFile)) return false;
	const pidData = await asyncReadFile(pidFile, 'utf-8');
	const contents = pidData.split('\n');
	if (contents[7] && contents[7].includes('ready')) {
		started = true;
		return true;
	} else {
		return false;
	}
}

export async function initPG() {
	// If no data dir is present, we're going to init one
	const conf = getConfig();
	const pgDataDir = resolve(conf.appPath, conf.PathDB, 'postgres');
	await updatePGConf();
	const pidFile = resolve(pgDataDir, 'postmaster.pid');
	const pidWatcher = watch(pidFile, {useFsEvents: false});
	pidWatcher.on('unlink', () => {
		emit('postgresShutdown');
	});
	if (await checkPIDFile(pidFile)) {
		logger.info('[DB] Bundled PostgreSQL is already running');
		return true;
	}
	logger.info('[DB] Launching bundled PostgreSQL...');
	return new Promise((OK, NOK) => {
		try {
			pidWatcher.on('change', () => {
				checkPIDFile(pidFile).then(() => {
					if (started) OK();
				});
			});
			// 30 seconds timeout before aborting
			setTimeout(() => {
				if (!started) NOK('Bundled PostgreSQL startup failed : Timeout (check logs)');
			}, 30000);
			execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresCTLExe), ['start', '-D', pgDataDir ], {
				cwd: resolve(conf.appPath, conf.BinPostgresPath)
			});
		} catch(err) {
			NOK(`Bundled PostgreSQL startup failed : ${err}`);
		}
	});
}


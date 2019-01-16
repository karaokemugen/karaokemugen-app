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

export async function updatePGConfPort() {
	// Editing port in postgresql.conf
	const conf = getConfig();
	const pgConfFile = resolve(conf.appPath, conf.PathDB, 'postgres/postgresql.conf');
	const pgConf = await asyncReadFile(pgConfFile, 'utf-8');
	//Parsing the ini file by hand since it can't be parsed well with ini package
	const pgConfArr = pgConf.split('\n');
	const portFound = pgConfArr.some(l => {
		return l.startsWith('port=');
	});
	if (!portFound) {
		pgConfArr.push(`port=${conf.db.prod.port}`);
	} else {
		for (const i in pgConfArr) {
			if (pgConfArr[i].startsWith('port=')) pgConfArr[i] = `port=${conf.db.prod.port}`;
		};
	}
	await asyncWriteFile(pgConfFile, pgConfArr.join('\n'), 'utf-8');
}

export async function initPG() {
	// If no data dir is present, we're going to init one
	const conf = getConfig();
	const pgDataDir = resolve(conf.appPath, conf.PathDB, 'postgres');
	if (!await asyncExists(pgDataDir)) {
		logger.info('[DB] Creating initial PostgreSQL data...');
		await execa(resolve(conf.BinPostgresPath, conf.BinPostgresInitExe), [ '-U', conf.db.prod.superuser, '-E', 'UTF-8', '-D', pgDataDir ], {
			cwd: resolve(conf.appPath, conf.BinPostgresPath)
		});
	}
	await updatePGConfPort();
	logger.info('[DB] Launching bundled PostgreSQL...');
	return new Promise((OK, NOK) => {
		try {
			const pidFile = resolve(pgDataDir, 'postmaster.pid');
			const pidWatcher = watch(pidFile, {useFsEvents: false});
			// 30 seconds timeout before aborting
			setTimeout(() => {
				if (!started) NOK('Bundled PostgreSQL startup failed : Timeout (check logs)');
			}, 30000);
			pidWatcher.on('change', () => {
				asyncReadFile(pidFile, 'utf-8').then(pidData => {
					const contents = pidData.split('\n');
					if (contents[7] && contents[7].includes('ready')) {
						started = true;
						OK();
					}
				});
			});
			pidWatcher.on('unlink', () => {
				emit('postgresShutdown');
			});
			const stream = execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresCTLExe), ['start', '-D', pgDataDir ], {
				cwd: resolve(conf.appPath, conf.BinPostgresPath)
			}).stderr;
			stream.on('data', data => {
				logger.debug(`[Postgres] ${data.toString()}`);
			});
		} catch(err) {
			NOK(`Bundled PostgreSQL startup failed : ${err}`);
		}
	});
}


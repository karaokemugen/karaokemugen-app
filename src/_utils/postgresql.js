// Manages Postgresql server binary

import execa from 'execa';
import {resolve} from 'path';
import {watch} from 'chokidar';
import {asyncReadFile} from './files';
import {getConfig} from './config';
import {emit} from './pubsub';
import logger from 'winston';

let started = false;

export function checkPG() {
	return started;
}

export async function killPG() {
	const conf = getConfig();
	const pgDataDir = resolve(resolve(conf.appPath,conf.BinPostgresPath), '../data');
	emit('postgresShutdownInProgress');
	return await execa(resolve(conf.BinPostgresPath, conf.BinPostgresCTLExe), ['-D', pgDataDir,'stop'], {
		cwd: resolve(conf.appPath, conf.BinPostgresPath)
	});
}

export function initPG() {
	return new Promise((OK, NOK) => {
		try {
			const conf = getConfig();
			const pgDataDir = resolve(conf.appPath, conf.BinPostgresPath, '../data');
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
			const stream = execa(resolve(conf.appPath, conf.BinPostgresPath, conf.BinPostgresExe), ['-D', pgDataDir, '-p', conf.db.prod.port ], {
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


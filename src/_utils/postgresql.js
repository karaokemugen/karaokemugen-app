// Manages Postgresql server binary

import execa from 'execa';
import {resolve} from 'path';
import {watch} from 'chokidar';
import {asyncExists, asyncReadFile} from './files';
import {getConfig} from './config';
import {emit} from './pubsub';
import logger from 'winston';
import {Readable} from 'stream';

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

export async function initPG() {
	// If no data dir is present, we're going to init one
	const conf = getConfig();
	const pgDataDir = resolve(conf.appPath, conf.PathDB, 'postgres');
	if (!await asyncExists(resolve(pgDataDir, 'PG_VERSION'))) {
		logger.info('[DB] Creating initial PostgreSQL data...');
		await execa(resolve(conf.BinPostgresPath, conf.BinPostgresInitExe), [ '-U', conf.db.prod.superuser, '-E', 'UTF-8', '-D', pgDataDir ], {
			cwd: resolve(conf.appPath, conf.BinPostgresPath)
		});
	}
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


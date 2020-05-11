import logger from 'winston';
import {getConfig} from '../lib/utils/config';
import {getState} from '../utils/state';
import {generateDatabase} from '../lib/services/generation';
import Postgrator, { Migration } from 'postgrator';

import {isShutdownPG, initPG} from '../utils/postgresql';
import { baseChecksum } from './dataStore';
import { DBStats } from '../types/database/database';
import { getSettings, saveSetting, connectDB, db, getInstanceID, setInstanceID, newDBTask } from '../lib/dao/database';
import { v4 as uuidV4 } from 'uuid';
import { resolve } from 'path';
import { getPlaylists, reorderPlaylist } from './playlist';
import { errorStep } from '../electron/electronLogger';
import { migrations } from '../utils/migrationsBeforePostgrator';
import i18next from 'i18next';

const sql = require('./sql/database');

export async function compareKarasChecksum(silent?: boolean): Promise<boolean> {
	logger.info('[Store] Comparing files and database data');
	const [settings, currentChecksum] = await Promise.all([
		getSettings(),
		baseChecksum(silent)
	]);
	if (settings.baseChecksum !== currentChecksum) {
		await saveSetting('baseChecksum', currentChecksum);
		return true;
	}
	if (currentChecksum === null) return undefined;
	return false;
}

function errorFunction(err: any) {
	// If shutdown is in progress for PG binary, we won't catch errors. (or we'll get connection reset messages spamming console)
	if (!isShutdownPG()) logger.error(`[DB] Database error : ${err}`);
}

/** Initialize a new database with the bundled PostgreSQL server */
export async function initDB() {
	const conf = getConfig();
	await connectDB({superuser: true, db: 'postgres', log: getState().opt.sql}, errorFunction);
	try {
		// Testing if database exists. If it does, no need to do the other stuff
		const {rows} = await db().query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${conf.Database.prod.database}'`);
		if (rows.length > 0) return;
	} catch(err) {
		throw err;
	}
	try {
		await db().query(`CREATE DATABASE ${conf.Database.prod.database} ENCODING 'UTF8'`);
		logger.debug('[DB] Database created');
	} catch(err) {
		logger.debug('[DB] Database already exists');
	}
	try {
		await db().query(`CREATE USER ${conf.Database.prod.user} WITH ENCRYPTED PASSWORD '${conf.Database.prod.password}';`);
		logger.debug('[DB] User created');
	} catch(err) {
		logger.debug('[DB] User already exists');
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.Database.prod.database} TO ${conf.Database.prod.user};`);
	// We need to reconnect to create the extension on our newly created database
	await connectDB({superuser: true, db: conf.Database.prod.database, log: getState().opt.sql}, errorFunction);
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('[DB] Extension unaccent already registered');
	}
}

async function migrateFromDBMigrate() {
	// Return early if migrations table does not exist
	let lastMigration: any;
	try {
		lastMigration = await db().query('SELECT * FROM migrations ORDER BY id DESC LIMIT 1');
	} catch(err) {
		return;
	}
	logger.info('[DB] Old migration system found, converting...');
	const id = lastMigration.rows[0].name.replace('/', '').split('-')[0];
	const migrationsDone = migrations.filter(m => m.version <= id);
	try {
		await db().query(`CREATE TABLE schemaversion (
			version BIGINT PRIMARY KEY,
			name TEXT,
			md5 TEXT,
			run_at TIMESTAMPTZ
		);
		`);
	} catch(err) {
		throw 'For some strange reason you already have a schemaversion table along with a migrations table. Delete one or the other.'
	};
	for (const migration of migrationsDone) {
		db().query(`INSERT INTO schemaversion VALUES('${migration.version}', '${migration.name}', '${migration.md5}', '${new Date().toISOString()}')`);
	}
	await db().query('DROP TABLE migrations;');
}

async function migrateDB(): Promise<Migration[]> {
	logger.info('[DB] Running migrations if needed');
	// First check if database still has db-migrate and determine at which we're at.
	await migrateFromDBMigrate();
	const conf = getConfig();
	const migrator = new Postgrator({
		migrationDirectory: resolve(getState().resourcePath, 'migrations/'),
		host: conf.Database.prod.host,
		driver: conf.Database.prod.driver,
		username: conf.Database.prod.username,
		password: conf.Database.prod.password,
		port: conf.Database.prod.port,
		database: conf.Database.prod.database,
		validateChecksums: false,
	});
	try {
		const migrations = await migrator.migrate();
		if (migrations.length > 0) logger.info(`[DB] Executed ${migrations.length} migrations`);
		logger.debug(`[DB] Migrations executed : ${JSON.stringify(migrations)}`);
		return migrations;
	} catch(err) {
		throw `Migrations failed : ${err}`;
	}
}


export async function initDBSystem(): Promise<Migration[]> {
	const conf = getConfig();
	const state = getState();
	// Only for bundled postgres binary :
	// First login as super user to make sure user, database and extensions are created
	let migrations: Migration[];
	try {
		if (conf.Database.prod.bundledPostgresBinary) {
			await initPG();
			await initDB();
		}
		logger.info('[DB] Initializing database connection');
		await connectDB({
			superuser: false,
			db: conf.Database.prod.database,
			log: state.opt.sql
		}, errorFunction);
		migrations = await migrateDB();
	} catch(err) {
		errorStep(i18next.t('ERROR_CONNECT_PG'));
		throw `Database system initialization failed : ${err}`;
	}
	if (!await getInstanceID()) {
		conf.App.InstanceID
			? setInstanceID(conf.App.InstanceID)
			: setInstanceID(uuidV4());
	}
	if (state.opt.reset) await resetUserData();

	logger.debug( '[DB] Database Interface is READY');
	return migrations;
}

export async function resetUserData() {
	await db().query(sql.resetUserData);
	logger.warn('[DB] User data has been reset!');
}

export async function getStats(): Promise<DBStats> {
	const res = await db().query(sql.getStats);
	return res.rows[0];
}

export async function generateDB(queue?: boolean): Promise<boolean> {
	try {
		const opts = {validateOnly: false, progressBar: true};
		if (queue) {
			newDBTask({
				name: 'generation',
				func: generateDatabase,
				args: [opts]
			});
			const pls = await getPlaylists(false);
			for (const pl of pls) {
				newDBTask({
					func: reorderPlaylist,
					args: [pl.playlist_id],
					name: `reorderPlaylist${pl.playlist_id}`
				});
			}
		} else {
			await generateDatabase(opts);
			const pls = await getPlaylists(false);
			for (const pl of pls) {
				await reorderPlaylist(pl.playlist_id);
			}
		}
	} catch(err) {
		throw err;
	}
	return true;
}


import i18next from 'i18next';
import { resolve } from 'path';
import Postgrator, { Migration } from 'postgrator';
import { v4 as uuidV4 } from 'uuid';
import logger from 'winston';

import { errorStep } from '../electron/electronLogger';
import { connectDB, db, getInstanceID, getSettings, saveSetting, setInstanceID } from '../lib/dao/database';
import {generateDatabase} from '../lib/services/generation';
import {getConfig} from '../lib/utils/config';
import { testCurrentBLCSet } from '../services/blacklist';
import { DBStats } from '../types/database/database';
import { migrations } from '../utils/migrationsBeforePostgrator';
import {initPG,isShutdownPG} from '../utils/postgresql';
import sentry from '../utils/sentry';
import {getState} from '../utils/state';
import { generateBlacklist } from './blacklist';
import { baseChecksum } from './dataStore';
import { getPlaylists, reorderPlaylist } from './playlist';
import { sqlGetStats,sqlResetUserData } from './sql/database';

export async function compareKarasChecksum(): Promise<boolean> {
	logger.info('Comparing files and database data', {service: 'Store'});
	const [settings, currentChecksum] = await Promise.all([
		getSettings(),
		baseChecksum()
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
	if (!isShutdownPG()) logger.error('Database error', {service: 'DB', obj: err});
}

/** Initialize a new database with the bundled PostgreSQL server */
export async function initDB() {
	const conf = getConfig();
	await connectDB(errorFunction, {superuser: true, db: 'postgres', log: getState().opt.sql});
	try {
		// Testing if database exists. If it does, no need to do the other stuff
		const {rows} = await db().query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${conf.Database.prod.database}'`);
		if (rows.length > 0) return;
	} catch(err) {
		throw new Error(err);
	}
	try {
		await db().query(`CREATE DATABASE ${conf.Database.prod.database} ENCODING 'UTF8'`);
		logger.debug('Database created', {service: 'DB'});
	} catch(err) {
		logger.debug('Database already exists', {service: 'DB'});
	}
	try {
		await db().query(`CREATE USER ${conf.Database.prod.user} WITH ENCRYPTED PASSWORD '${conf.Database.prod.password}';`);
		logger.debug('User created', {service: 'DB'});
	} catch(err) {
		logger.debug('User already exists', {service: 'DB'});
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.Database.prod.database} TO ${conf.Database.prod.user};`);
	// We need to reconnect to create the extension on our newly created database
	await connectDB(errorFunction, {superuser: true, db: conf.Database.prod.database, log: getState().opt.sql});
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('Extension unaccent already registered', {service: 'DB'});
	}
}

async function migrateFromDBMigrate() {
	// Return early if migrations table does not exist
	let migrationsDone = [];
	try {
		const tables = await db().query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\' AND tablename = \'migrations\'');
		if (tables.rows.length === 0) return;
		const lastMigration = await db().query('SELECT * FROM migrations ORDER BY id DESC LIMIT 1');
		logger.info('Old migration system found, converting...', {service: 'DB'});
		if (lastMigration.rows.length === 0) {
			// Migration table empty for whatever reason.
			await db().query('DROP TABLE migrations;');
			return;
		}
		const id = lastMigration.rows[0].name.replace('/', '').split('-')[0];
		migrationsDone = migrations.filter(m => m.version <= id);
	} catch(err) {
		logger.error('Error preparing migrations', {service: 'DB', obj: err});
		sentry.error(err);
		throw err;
	}
	try {
		await db().query(`CREATE TABLE schemaversion (
			version BIGINT PRIMARY KEY,
			name TEXT,
			md5 TEXT,
			run_at TIMESTAMPTZ
		);
		`);
	} catch(err) {
		const error = new Error('Migration table already exists');
		sentry.error(error);
		throw error;
	}
	for (const migration of migrationsDone) {
		db().query(`INSERT INTO schemaversion VALUES('${migration.version}', '${migration.name}', '${migration.md5}', '${new Date().toISOString()}')`);
	}
	await db().query('DROP TABLE migrations;');
}

async function migrateDB(): Promise<Migration[]> {
	logger.info('Running migrations if needed', {service: 'DB'});
	// First check if database still has db-migrate and determine at which we're at.
	await migrateFromDBMigrate();
	const conf = getConfig();
	const migrator = new Postgrator({
		migrationDirectory: resolve(getState().resourcePath, 'migrations/'),
		host: conf.Database.prod.host,
		driver: conf.Database.prod.driver,
		username: conf.Database.prod.user,
		password: conf.Database.prod.password,
		port: conf.Database.prod.port,
		database: conf.Database.prod.database,
		validateChecksums: false,
	});
	try {
		const migrations = await migrator.migrate();
		if (migrations.length > 0) logger.info(`Executed ${migrations.length} migrations`, {service: 'DB'});
		logger.debug('Migrations executed', {service: 'DB', obj: migrations});
		return migrations;
	} catch(err) {
		const error = new Error(`Migrations failed : ${err}`);
		sentry.error(error);
		throw error;
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
		logger.info('Initializing database connection', {service: 'DB'});
		await connectDB(errorFunction, {
			superuser: false,
			db: conf.Database.prod.database,
			log: state.opt.sql
		});
		migrations = await migrateDB();
	} catch(err) {
		errorStep(i18next.t('ERROR_CONNECT_PG'));
		const error = new Error(`Database system initialization failed : ${err}`);
		sentry.error(error, 'Fatal');
		throw error;
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
	await db().query(sqlResetUserData);
	// Recreate initial blacklist criteria set since we'll need it for database generation right after
	await testCurrentBLCSet();
	logger.warn('User data has been reset!', {service: 'DB'});
}

export async function getStats(): Promise<DBStats> {
	const res = await db().query(sqlGetStats);
	return res.rows[0];
}

export async function generateDB(): Promise<boolean> {
	try {
		const opts = {validateOnly: false, progressBar: true};
		await generateDatabase(opts);
		const pls = await getPlaylists(false);
		for (const pl of pls) {
			await reorderPlaylist(pl.playlist_id);
		}
		await generateBlacklist();
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw err;
	}
	return true;
}




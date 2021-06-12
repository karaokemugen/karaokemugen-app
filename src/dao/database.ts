import { promises as fs } from 'fs';
import i18next from 'i18next';
import { resolve } from 'path';
import Postgrator, { Migration } from 'postgrator';
import { v4 as uuidV4 } from 'uuid';
import logger from 'winston';

import { errorStep } from '../electron/electronLogger';
import { connectDB, db, getInstanceID, getSettings, saveSetting, setInstanceID } from '../lib/dao/database';
import {generateDatabase} from '../lib/services/generation';
import {getConfig} from '../lib/utils/config';
import { uuidRegexp } from '../lib/utils/constants';
import { asyncReadDirFilter } from '../lib/utils/files';
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

export let DBReady = false;

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
	// Testing if database exists. If it does, no need to do the other stuff
	const {rows} = await db().query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${conf.System.Database.database}'`);
	if (rows.length === 0) {
		await db().query(`CREATE DATABASE ${conf.System.Database.database} ENCODING 'UTF8'`);
		logger.debug('Database created', {service: 'DB'});
		try {
			await db().query(`CREATE USER ${conf.System.Database.username} WITH ENCRYPTED PASSWORD '${conf.System.Database.password}';`);
			logger.debug('User created', {service: 'DB'});
		} catch(err) {
			logger.debug('User already exists', {service: 'DB'});
		}
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.System.Database.database} TO ${conf.System.Database.username};`);
	// We need to reconnect to create the extension on our newly created database
	await connectDB(errorFunction, {superuser: true, db: conf.System.Database.database, log: getState().opt.sql});
	try {
		await db().query('CREATE EXTENSION IF NOT EXISTS unaccent;');
		await db().query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
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

/** Wipes old JS migrations if any are found from dbMigrate. That can happen for people updating from installs or zips since we're not deleting old migrations in the resources dir. Oversight on our part. */
async function cleanupOldMigrations(migrationDir: string) {
	// TODO: Remove this function once 6.0 or 7.0 hits.
	const files = await asyncReadDirFilter(migrationDir, '.js');
	const promises = [];
	for (const file of files) {
		if (file.substr(0, 8) < '20201120') {
			// This means this file belongs to the old JS migration files. We delete it.
			promises.push(fs.unlink(resolve(migrationDir, file)));
		}
	}
	await Promise.all(promises);
}

async function migrateDB(): Promise<Migration[]> {
	logger.info('Running migrations if needed', {service: 'DB'});
	// First check if database still has db-migrate and determine at which we're at.
	await migrateFromDBMigrate();
	const conf = getConfig();
	const migrationDir = resolve(getState().resourcePath, 'migrations/');
	await cleanupOldMigrations(migrationDir);
	const migrator = new Postgrator({
		migrationDirectory: migrationDir,
		host: conf.System.Database.host,
		driver: 'pg',
		username: conf.System.Database.username,
		password: conf.System.Database.password,
		port: conf.System.Database.port,
		database: conf.System.Database.database,
		validateChecksums: false,
	});
	try {
		const migrations = await migrator.migrate();
		if (migrations.length > 0) logger.info(`Executed ${migrations.length} migrations`, {service: 'DB'});
		logger.debug('Migrations executed', {service: 'DB', obj: migrations});
		return migrations;
	} catch(err) {
		const error = new Error(`Migrations failed : ${err}`);
		logger.error('Migrations done prior to error : ', {service: 'DB', obj: err.appliedMigrations});
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
		if (conf.System.Database.bundledPostgresBinary) {
			await initPG();
			await initDB();
		}
		logger.info('Initializing database connection', {service: 'DB'});
		await connectDB(errorFunction, {
			superuser: false,
			db: conf.System.Database.database,
			log: state.opt.sql
		});
		migrations = await migrateDB();
	} catch(err) {
		errorStep(i18next.t('ERROR_CONNECT_PG'));
		sentry.error(err, 'Fatal');
		throw Error(`Database system initialization failed : ${err}`);
	}
	if (!await getInstanceID()) {
		// Some interesting people actually copy/paste what's in the sample config file so we're going to be extra nice with them even though we shouldn't and set it correctly if the config's instanceID is wrong.
		conf.App.InstanceID && new RegExp(uuidRegexp).test(conf.App.InstanceID)
			? setInstanceID(conf.App.InstanceID)
			: setInstanceID(uuidV4());
	}
	if (state.opt.reset) await resetUserData();

	logger.debug('Database Interface is READY', {service: 'DB'});
	DBReady = true;
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
			await reorderPlaylist(pl.plaid);
		}
		await generateBlacklist();
	} catch(err) {
		sentry.error(err);
		throw err;
	}
	return true;
}




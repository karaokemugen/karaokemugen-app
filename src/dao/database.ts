import { app, dialog } from 'electron';
import i18next from 'i18next';
import { resolve } from 'path';
import Postgrator, { Migration } from 'postgrator';
import { v4 as uuidV4 } from 'uuid';
import logger from 'winston';

import { errorStep } from '../electron/electronLogger';
import { connectDB, db, getInstanceID, getSettings, saveSetting, setInstanceID } from '../lib/dao/database';
import { generateDatabase } from '../lib/services/generation';
import { getConfig } from '../lib/utils/config';
import { uuidRegexp } from '../lib/utils/constants';
import { updateAllSmartPlaylists } from '../services/smartPlaylist';
import { DBStats } from '../types/database/database';
import { migrateFromDBMigrate } from '../utils/hokutoNoCode';
import { initPG, isShutdownPG, restorePG } from '../utils/postgresql';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { baseChecksum } from './dataStore';
import { reorderPlaylist, selectPlaylists } from './playlist';
import { sqlGetStats, sqlResetUserData } from './sql/database';

export async function compareKarasChecksum(): Promise<boolean> {
	logger.info('Comparing files and database data', { service: 'Store' });
	const [settings, currentChecksum] = await Promise.all([getSettings(), baseChecksum()]);
	if (settings.baseChecksum !== currentChecksum) {
		await saveSetting('baseChecksum', currentChecksum);
		return true;
	}
	if (currentChecksum === null) return undefined;
	return false;
}

function errorFunction(err: any) {
	// If shutdown is in progress for PG binary, we won't catch errors. (or we'll get connection reset messages spamming console)
	if (!isShutdownPG()) logger.error('Database error', { service: 'DB', obj: err });
}

/** Initialize a new database with the bundled PostgreSQL server */
export async function initDB() {
	const conf = getConfig();
	await connectDB(errorFunction, { superuser: true, db: 'postgres', log: getState().opt.sql });
	// Testing if database exists. If it does, no need to do the other stuff
	const { rows } = await db().query(
		`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${conf.System.Database.database}'`
	);
	if (rows.length === 0) {
		await db().query(`CREATE DATABASE ${conf.System.Database.database} ENCODING 'UTF8'`);
		logger.debug('Database created', { service: 'DB' });
		try {
			await db().query(
				`CREATE USER ${conf.System.Database.username} WITH ENCRYPTED PASSWORD '${conf.System.Database.password}';`
			);
			logger.debug('User created', { service: 'DB' });
		} catch (err) {
			logger.debug('User already exists', { service: 'DB' });
		}
	}
	await db().query(
		`GRANT ALL PRIVILEGES ON DATABASE ${conf.System.Database.database} TO ${conf.System.Database.username};`
	);
	// We need to reconnect to create the extension on our newly created database
	await connectDB(errorFunction, { superuser: true, db: conf.System.Database.database, log: getState().opt.sql });
	await db().query('CREATE EXTENSION IF NOT EXISTS unaccent;');
	await db().query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
}

async function migrateDB(): Promise<Migration[]> {
	logger.info('Running migrations if needed', { service: 'DB' });
	// First check if database still has db-migrate and determine at which we're at.
	await migrateFromDBMigrate();
	const conf = getConfig();
	const migrationDir = resolve(getState().resourcePath, 'migrations/');
	const migrator = new Postgrator({
		migrationPattern: `${migrationDir}/*.sql`,
		driver: 'pg',
		database: conf.System.Database.database,
		execQuery: query => db().query(query),
		validateChecksums: false,
	});
	try {
		const migrations = await migrator.migrate();
		if (migrations.length > 0) logger.info(`Executed ${migrations.length} migrations`, { service: 'DB' });
		logger.debug('Migrations executed', { service: 'DB', obj: migrations });
		return migrations;
	} catch (err) {
		const error = new Error(`Migrations failed : ${err}`);
		logger.error('Migrations done prior to error : ', { service: 'DB', obj: err.appliedMigrations });
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
			if (getState().restoreNeeded) await restorePG();
		}
		logger.info('Initializing database connection', { service: 'DB' });
		await connectDB(errorFunction, {
			superuser: false,
			db: conf.System.Database.database,
			log: state.opt.sql,
		});
		migrations = await migrateDB();
	} catch (err) {
		if (app.isPackaged) {
			const res = await dialog.showMessageBox({
				type: 'error',
				title: i18next.t('DATABASE_CONNECTION_ERROR.TITLE'),
				message: i18next.t('DATABASE_CONNECTION_ERROR.MESSAGE'),
				buttons: [i18next.t('DATABASE_CONNECTION_ERROR.HELP'), i18next.t('MENU_FILE_QUIT')],
			});
			if (res.response === 0) {
				open(
					'https://discourse.karaokes.moe/t/error-database-initialization-failed-unable-to-connect-to-the-database/25'
				);
			}
		}
		errorStep(i18next.t('ERROR_CONNECT_PG'));
		if (!isShutdownPG()) sentry.error(err, 'Fatal');
		throw Error(`Database system initialization failed : ${err}`);
	}
	if (!(await getInstanceID())) {
		// Some interesting people actually copy/paste what's in the sample config file so we're going to be extra nice with them even though we shouldn't and set it correctly if the config's instanceID is wrong.
		conf.App.InstanceID && uuidRegexp.test(conf.App.InstanceID)
			? setInstanceID(conf.App.InstanceID)
			: setInstanceID(uuidV4());
	}
	if (state.opt.reset) await resetUserData();

	logger.debug('Database Interface is READY', { service: 'DB' });
	setState({ DBReady: true });
	return migrations;
}

export async function resetUserData() {
	await db().query(sqlResetUserData);
	logger.warn('User data has been reset!', { service: 'DB' });
}

export async function getStats(): Promise<DBStats> {
	const res = await db().query(sqlGetStats);
	return res.rows[0];
}

let generationInProgress = false;

export async function generateDB(): Promise<boolean> {
	try {
		if (generationInProgress) {
			const err = new Error();
			logger.warn(`Generation already in progress, returning early. Stack: ${err.stack}`, {
				service: 'DB',
				obj: err.stack,
			});
			return true;
		}
		generationInProgress = true;
		const opts = { validateOnly: false, progressBar: true };
		await generateDatabase(opts);
		const pls = await selectPlaylists(false);
		for (const pl of pls) {
			await reorderPlaylist(pl.plaid);
		}
		await updateAllSmartPlaylists();
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		generationInProgress = false;
	}
	return true;
}

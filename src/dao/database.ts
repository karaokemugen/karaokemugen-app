import { app, dialog, shell } from 'electron';
import fs from 'fs/promises';
import i18next from 'i18next';
import { sample } from 'lodash';
import { resolve } from 'path';
import Postgrator from 'postgrator';

import { exit, initKaraBase } from '../components/engine.js';
import { errorStep, initStep } from '../electron/electronLogger.js';
import { connectDB, db, getSettings, saveSetting } from '../lib/dao/database.js';
import { generateDatabase } from '../lib/services/generation.js';
import { getConfig } from '../lib/utils/config.js';
import { tagTypes } from '../lib/utils/constants.js';
import { fileExists } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { getRepos } from '../services/repo.js';
import { updateAllSmartPlaylists } from '../services/smartPlaylist.js';
import { DBStats } from '../types/database/database.js';
import { checkDumpExists, initPG, isShutdownPG, restorePG } from '../utils/postgresql.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { baseChecksum } from './dataStore.js';
import { reorderPlaylist, selectPlaylists } from './playlist.js';
import { sqlGetStats, sqlResetUserData } from './sql/database.js';
import { selectUsers } from './user.js';

const service = 'DB';

export async function compareKarasChecksum(): Promise<boolean> {
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
	if (!isShutdownPG()) logger.error('Database error', { service, obj: err });
}

/** Initialize a new database with the bundled PostgreSQL server
 * Returns true if database seems empty of data
 */
export async function initDB(): Promise<boolean> {
	profile('initDB');
	let baseEmpty = false;
	const conf = getConfig();
	await connectDB(errorFunction, {
		bundledPostgres: conf.System.Database.bundledPostgresBinary,
		superuser: true,
		db: 'postgres',
		log: getState().opt.sql,
	});
	// Testing if database exists. If it does, no need to do the other stuff
	const { rows } = await db().query(
		`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${conf.System.Database.database}'`
	);
	if (rows.length === 0) {
		baseEmpty = true;
		await db().query(`CREATE DATABASE ${conf.System.Database.database} ENCODING 'UTF8'`);
		logger.debug('Database created', { service });
		try {
			await db().query(
				`CREATE USER ${conf.System.Database.username} WITH ENCRYPTED PASSWORD '${conf.System.Database.password}';`
			);
			logger.debug('User created', { service });
		} catch (err) {
			logger.debug('User already exists', { service });
		}
	}
	await db().query(
		`GRANT ALL PRIVILEGES ON DATABASE ${conf.System.Database.database} TO ${conf.System.Database.username};`
	);
	// We need to reconnect to create the extension on our newly created database
	await connectDB(errorFunction, {
		bundledPostgres: conf.System.Database.bundledPostgresBinary,
		superuser: true,
		db: conf.System.Database.database,
		log: getState().opt.sql,
	});
	await db().query('CREATE EXTENSION IF NOT EXISTS unaccent;');
	if (process.platform === 'win32') await db().query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
	await db().query('GRANT CREATE ON SCHEMA public TO public;');
	profile('initDB');
	return baseEmpty;
}

/** Reads migrations.txt to determine if some migrations should be removed */
async function cleanupMigrations(migrationsDir: string) {
	const migrationsFile = resolve(migrationsDir, 'migrations.txt');

	if (!(await fileExists(migrationsFile))) {
		// File does not exist, which is fine(tm).
		// It's only provided with packaged versions.
		return;
	}
	const migrationsFileData = await fs.readFile(migrationsFile, 'utf-8');
	const migrationsInRelease = new Set(migrationsFileData.split('\n'));
	let migrationsInDir = await fs.readdir(migrationsDir);
	migrationsInDir = migrationsInDir.filter(e => e.endsWith('.sql'));
	for (const file of migrationsInDir) {
		if (!migrationsInRelease.has(file)) {
			logger.warn(`Removing extraneous migration ${file}`, { service });
			await fs.unlink(resolve(migrationsDir, file));
		}
	}
}

async function migrateDB(): Promise<Postgrator.Migration[]> {
	logger.info('Running migrations if needed', { service });
	profile('migrateDB');
	initStep(i18next.t('INIT_MIGRATION'));
	const conf = getConfig();
	const migrationDir = resolve(getState().resourcePath, 'migrations/');
	// First clean out any unnecessary migrations
	await cleanupMigrations(migrationDir);
	const migratorOptions = {
		migrationPattern: `${migrationDir}/*.sql`,
		driver: 'pg',
		database: conf.System.Database.database,
		execQuery: query => db().query(query),
		validateChecksums: false,
	} as Postgrator.Options;
	let migrator = new Postgrator(migratorOptions);
	const [currentVersion, maxVersionAvailable] = await Promise.all([
		migrator.getDatabaseVersion(),
		migrator.getMaxVersion(),
	]);
	let maxVersionInDB = currentVersion;
	// Only check this if app is packaged. Source code users should know what they're doing.
	if (app.isPackaged && maxVersionAvailable < maxVersionInDB) {
		// Database is in the future, abort mission.
		const res = await dialog.showMessageBox({
			type: 'error',
			title: i18next.t('DATABASE_IN_THE_FUTURE_ERROR.TITLE'),
			message: process.platform === 'darwin' ? i18next.t('DATABASE_IN_THE_FUTURE_ERROR.TITLE') : undefined,
			detail: i18next.t('DATABASE_IN_THE_FUTURE_ERROR.DETAIL'),
			defaultId: 0,
			buttons: [
				i18next.t('CANCEL'),
				i18next.t('DATABASE_IN_THE_FUTURE_ERROR.DELETE_ALL_DATA'),
				i18next.t('DATABASE_IN_THE_FUTURE_ERROR.CONTINUE_ANYWAY'),
			],
		});
		if (res.response === 0) {
			// Cancel
			await exit(1);
		} else if (res.response === 1) {
			// OK, we remove everything and start over.
			// Remove all tables and types
			const tables = await db().query(`
				SELECT tablename
  					FROM pg_tables
 				WHERE schemaname = 'public';
 			`);
			for (const row of tables.rows) {
				await db().query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE;`);
			}
			const types = await db().query(`
				SELECT DISTINCT ON(pg_type.typname)
					pg_type.typname AS enumtype,
					pg_enum.enumlabel AS enumlabel
				FROM pg_type
				JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid;
			`);
			for (const row of types.rows) {
				await db().query(`DROP TYPE ${row.enumtype}`);
			}
			maxVersionInDB = null;
			// Reinit migrator just in case
			migrator = new Postgrator(migratorOptions);
		}
		// Else continue as usual
	}
	const numberOfMigrationsNeeded = await determineNumberOfMigrations(maxVersionInDB);
	let task: Task;
	let migrationNumber = 0;
	if (numberOfMigrationsNeeded > 0) {
		task = new Task({
			// This is only used for a test in init page
			text: 'MIGRATING_DATABASE',
			value: migrationNumber,
			total: numberOfMigrationsNeeded,
		});
	}
	migrator.on('migration-started', migration => {
		migrationNumber += 1;
		logger.debug(`Applying migration ${migration.filename}...`);
		const migrationPhrases = i18next.t('MIGRATION_MESSAGES', { returnObjects: true }) as string[];
		if (task) {
			task.update({
				subtext: `${i18next.t('MIGRATION')} ${migrationNumber} / ${numberOfMigrationsNeeded} : ${sample(
					migrationPhrases
				)}...`,
				value: migrationNumber - 1, // Technically we're running that migration.
			});
		}
	});
	try {
		const migrations = await migrator.migrate();
		if (migrations.length > 0) logger.info(`Executed ${migrations.length} migrations`, { service });
		logger.debug('Migrations executed', { service });
		return migrations;
	} catch (err) {
		const error = new Error(`Migrations failed : ${err}`);
		logger.error('Migrations done prior to error : ', { service, obj: err.appliedMigrations });
		sentry.error(error);
		throw error;
	} finally {
		profile('migrateDB');
		if (task) task.end();
	}
}

export async function initDBSystem(): Promise<Postgrator.Migration[]> {
	profile('initDBSystem');
	const conf = getConfig();
	const state = getState();
	// Only for bundled postgres binary :
	// First login as super user to make sure user, database and extensions are created
	let migrations: Postgrator.Migration[];
	let restoreDone = false;
	try {
		if (conf.System.Database.bundledPostgresBinary) {
			await initPG();
			const isBaseEmpty = await initDB();
			// Determine if a dump exists. If it does, we should try to restore.
			const dumpExists = await checkDumpExists();
			if ((getConfig().System.Database.RestoreNeeded || isBaseEmpty) && dumpExists) {
				await restorePG().catch(_err => {
					logger.warn('Unable to restore dump during startup, continuing anyway', { service });
				});
				restoreDone = true;
			}
		}
		logger.info('Initializing database connection', { service });
		await connectDB(errorFunction, {
			bundledPostgres: conf.System.Database.bundledPostgresBinary,
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
				message: process.platform === 'darwin' ? i18next.t('DATABASE_CONNECTION_ERROR.TITLE') : undefined,
				detail: i18next.t('DATABASE_CONNECTION_ERROR.DETAIL'),
				buttons: [i18next.t('DATABASE_CONNECTION_ERROR.HELP'), 'OK'],
			});
			if (res.response === 0) {
				shell.openExternal(
					'https://discourse.karaokes.moe/t/error-database-initialization-failed-unable-to-connect-to-the-database/25'
				);
			}
		}
		logger.error('Database system initialization failed', { service, obj: err });
		errorStep(i18next.t('ERROR_CONNECT_PG'));
		if (!isShutdownPG()) sentry.error(err, 'fatal');
		throw err;
	}
	if (state.opt.reset) await resetUserData();

	logger.debug('Database Interface is READY', { service });
	setState({ DBReady: true });
	profile('initDBSystem');
	// Trigger a generation if a restore was needed after a PG upgrade
	if (restoreDone) {
		await initKaraBase();
	}
	return migrations;
}

export async function resetUserData() {
	await db().query(sqlResetUserData);
	logger.warn('User data has been reset!', { service });
}

export async function getStats(selectedRepos?: string[]): Promise<DBStats> {
	const collectionClauses = [];
	const collections = getConfig().Karaoke.Collections;
	if (collections)
		for (const collection of Object.keys(collections)) {
			if (collections[collection] === true)
				collectionClauses.push(`'${collection}~${tagTypes.collections}' = ANY(ak.tid)`);
		}
	const repos = selectedRepos || getRepos().map(r => r.Name);
	const res = await db().query(sqlGetStats(collectionClauses), [repos]);
	// Bigints are returned as strings in node-postgres for now. So we'll turn it into a number here.
	// See this issue : https://github.com/brianc/node-postgres/issues/2398
	return { ...res.rows[0], total_media_size: +res.rows[0].total_media_size };
}

let generationInProgress = false;

export async function generateDB(): Promise<boolean> {
	try {
		if (generationInProgress) {
			const err = new Error();
			logger.warn(`Generation already in progress, returning early. Stack: ${err.stack}`, {
				service,
				obj: err.stack,
			});
			return true;
		}
		generationInProgress = true;
		const opts = { validateOnly: false };
		await generateDatabase(opts);
		const pls = await selectPlaylists(false);
		for (const pl of pls) {
			await reorderPlaylist(pl.plaid);
			// Smart playlists are updated below
			if (!pl.flag_smart) emitWS('playlistContentsUpdated', pl.plaid);
		}
		const users = await selectUsers({});
		for (const user of users) {
			emitWS('favoritesUpdated', user.login);
			emitWS('animelistUpdated', user.login);
		}
		// Library is refreshed inside this so no need to add it here.
		await updateAllSmartPlaylists();
		emitWS('databaseGenerated');
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		generationInProgress = false;
	}
	return true;
}

async function determineNumberOfMigrations(currentMigration: number): Promise<number> {
	const migrationDir = resolve(getState().resourcePath, 'migrations/');
	const dir = await fs.readdir(migrationDir);
	const migrations = dir.map(e => e.split('.')[0]).filter(e => +e > currentMigration);
	return migrations.length;
}

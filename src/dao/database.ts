import logger from 'winston';
import {getConfig, setConfig} from '../lib/utils/config';
import {getState} from '../utils/state';
import {exit} from '../services/engine';
import {duration} from '../lib/utils/date';
import {generateDatabase} from '../lib/services/generation';
import DBMigrate from 'db-migrate';
import {join} from 'path';
import {isShutdownPG, initPG} from '../utils/postgresql';
import { baseChecksum } from './dataStore';
import { DBStats } from '../types/database/database';
import { getSettings, saveSetting, connectDB, db, vacuum, getInstanceID, setInstanceID } from '../lib/dao/database';
import { generateBlacklist } from '../services/blacklist';
import uuidV4 from 'uuid/v4';

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

async function migrateDB() {
	logger.info('[DB] Running migrations if needed');
	const conf = getConfig();
	let options = {
		config: conf.Database,
		noPlugins: true,
		plugins: {
			dependencies: {
				'db-migrate': 1,
				'db-migrate-pg': 1
			}
		},
		cmdOptions: {
			'migrations-dir': join(__dirname, '../../migrations/'),
			'log-level': 'warn|error'
		}
	};
	if (getState().opt.debug) options.cmdOptions['log-level'] = 'warn|error|info';
	const dbm = DBMigrate.getInstance(true, options);
	try {
		await dbm.sync('all');
	} catch(err) {
		throw `Migrations failed : ${err}`;
	}
}


export async function initDBSystem(): Promise<boolean> {
	let doGenerate: boolean;
	const conf = getConfig();
	const state = getState();
	if (state.opt.generateDB) doGenerate = true;
	// Only for bundled postgres binary :
	// First login as super user to make sure user, database and extensions are created
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
		await migrateDB();
	} catch(err) {
		throw `Database initialization failed : ${err}`;
	}
	if (!await getInstanceID()) {
		conf.App.InstanceID
			? setInstanceID(conf.App.InstanceID)
			: setInstanceID(uuidV4());
	}
	if (state.opt.reset) await resetUserData();
	if (!state.opt.noBaseCheck && !conf.App.QuickStart) {
		const filesChanged = await compareKarasChecksum();
		if (filesChanged === true) {
			logger.info('[DB] Data files have changed: database generation triggered');
			doGenerate = true;
		}
		// If karasChecksum returns null, it means there were no files to check. We run generation anyway (it'll return an empty database) to avoid making the current startup procedure any more complex.
		if (filesChanged === undefined) doGenerate = true;
	}
	const settings = await getSettings();
	if (!doGenerate && !settings.lastGeneration) {
		setConfig({ App: { FirstRun: true }});
		logger.info('[DB] Unable to tell when last generation occured: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) try {
		await generateDB();
	} catch(err) {
		logger.error(`[DB] Generation failed : ${err}`);
		throw 'Generation failure';
	}
	// Run this in the background
	vacuum();
	generateBlacklist();
	logger.debug( '[DB] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(+stats.duration)})`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
	return true;
}

export async function resetUserData() {
	await db().query(sql.resetUserData);
	logger.warn('[DB] User data has been reset!');
}

export async function getStats(): Promise<DBStats> {
	const res = await db().query(sql.getStats);
	return res.rows[0];
}

export async function generateDB(): Promise<boolean> {
	const state = getState();
	try {
		const modified = await generateDatabase(false, true);
		logger.info('[DB] Database generation completed successfully!');
		if (modified) {
			logger.info('[DB] Kara files have been modified during generation, re-evaluating store');
			await compareKarasChecksum(true);
		}
		if (state.opt.generateDB) await exit(0);
	} catch(err) {
		if (state.opt.generateDB) await exit(1);
	}
	return true;
}


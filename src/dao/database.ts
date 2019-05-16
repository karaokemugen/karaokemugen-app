import logger from 'winston';
import {getConfig, setConfig} from '../utils/config';
import {getState} from '../utils/state';
import {Pool} from 'pg';
import {exit} from '../services/engine';
import {duration} from '../utils/date';
import deburr from 'lodash.deburr';
import langs from 'langs';
import {run as generateDB} from '../services/generation';
import DBMigrate from 'db-migrate';
import {join} from 'path';
import {isShutdownPG, initPG} from '../utils/postgresql';
import {refreshYears, refreshKaras} from './kara';
import {refreshTags, refreshKaraTags} from './tag';
import {refreshKaraSeriesLang, refreshSeries, refreshKaraSeries} from './series';
import {profile} from '../utils/logger';
import {from as copyFrom} from 'pg-copy-streams';
import {Query, Settings} from '../types/database';
import { baseChecksum } from './dataStore';

const sql = require('./sql/database');

export async function compareKarasChecksum(silent?: boolean) {
	logger.info('[DB] Comparing files and database data');
	const [settings, currentChecksum] = await Promise.all([
		getSettings(),
		baseChecksum(silent)
	]);
	if (settings.baseChecksum !== currentChecksum) {
		await saveSetting('baseChecksum', currentChecksum);
		return false;
	}
	return currentChecksum;
}

export function paramWords(filter: string) {
	//This function takes a search filter (list of words), cleans and maps them for use in SQL queries "LIKE".
	let params = {};
	const words = deburr(filter)
		.toLowerCase()
		.replace('\'', ' ')
		.replace(',', ' ')
		.split(' ')
		.filter((s: string) => !('' === s))
		.map((word: string) => `%${word}%`);
	for (const i in words) {
		params[`word${i}`] = `%${words[i]}%`;
	}
	return params;
}

async function queryLog(...args: any[]) {
	logger.debug(`[SQL] ${JSON.stringify(args).replace(/\\n/g,'\n').replace(/\\t/g,'   ')}`);
	return database.query_orig(...args);
}

async function query() {
	// Fake query function used as a decoy when closing DB.
	return {rows: [{}]};
}

export function closeDB() {
	database = { query: query};
}

export function buildClauses(words: string) {
	const params = paramWords(words);
	let sql = [];
	for (const i in words.split(' ').filter(s => !('' === s))) {
		sql.push(`lower(unaccent(ak.tags)) LIKE :word${i} OR
		lower(unaccent(ak.title)) LIKE :word${i} OR
		lower(unaccent(ak.serie)) LIKE :word${i} OR
		lower(unaccent(ak.serie_altname::varchar)) LIKE :word${i} OR
		lower(unaccent(ak.serie_names)) LIKE :word${i}
		`);
	}
	return {
		sql: sql,
		params: params
	};
}

export function langSelector(lang: string, series?: boolean) {
	const conf = getConfig();
	const state = getState();
	const userLocale = langs.where('1',lang || state.EngineDefaultLocale);
	const engineLocale = langs.where('1',state.EngineDefaultLocale);
	//Fallback to english for cases other than 0 (original name)
	switch(+conf.Frontend.SeriesLanguageMode) {
	case 0: return {main: null, fallback: null};
	default:
	case 1:
		if (!series) return {main: 'SUBSTRING(ak.languages_sortable, 0, 3)', fallback: '\'eng\''};
		return {main: null, fallback: null};
	case 2: return {main: `'${engineLocale['2B']}'`, fallback: '\'eng\''};
	case 3: return {main: `'${userLocale['2B']}'`, fallback: '\'eng\''};
	}
}

// These two utility functions are used to make multiple inserts into one
// You can do only one insert with multiple values, this helps.
// expand returns ($1, $2), ($1, $2), ($1, $2) for (3, 2)
export function expand(rowCount: number, columnCount: number, startAt: number = 1){
	let index = startAt;
	return Array(rowCount).fill(0).map(() => `(${Array(columnCount).fill(0).map(() => `$${index++}`).join(', ')})`).join(', ');
}

// flatten([[1, 2], [3, 4]]) returns [1, 2, 3, 4]
export function flatten(arr: any[]){
	let newArr = [];
	arr.forEach(v => v.forEach((p: any) => newArr.push(p)));
	return newArr;
}

export async function copyFromData(table: string, data: string[][]) {
	const client = await database.connect();
	let stream = client.query(copyFrom(`COPY ${table} FROM STDIN DELIMITER '|' NULL ''`));
	const copyData = data.map(d => d.join('|')).join('\n');
	stream.write(copyData);
	stream.end();
	return new Promise((resolve, reject) => {
		stream.on('end', () => {
			client.release();
			resolve();
		});
		stream.on('error', (err: any) => {
			client.release();
			reject(err);
		});
	});
}

export async function transaction(queries: Query[]) {
	const client = await database.connect();
	try {
		await client.query('BEGIN');
		for (const query of queries) {
			if (query.params) {
				for (const param of query.params) {
					await client.query(query.sql, param);
				}
			} else {
				await client.query(query.sql);
			}
		}
		await client.query('COMMIT');
	} catch (err) {
		logger.error(`[DB] Transaction error : ${err}`);
		await client.query('ROLLBACK');
		throw err;
	} finally {
		await client.release();
	}
}

/* Opened DB is exposed to be used by DAO objects. */

let database: any;

export function db() {
	return database;
}

export async function connectDB(opts = {superuser: false, db: null}) {
	const conf = getConfig();
	const dbConfig = {
		host: conf.Database.prod.host,
		user: conf.Database.prod.user,
		port: conf.Database.prod.port,
		password: conf.Database.prod.password,
		database: conf.Database.prod.database
	};
	if (opts.superuser) {
		dbConfig.user = conf.Database.prod.superuser;
		dbConfig.password = conf.Database.prod.superuserPassword;
		dbConfig.database = opts.db;
	}
	database = new Pool(dbConfig);
	if (getState().opt.sql) {
		//If SQL logs are enabled, we're going to monkey-patch the query function.
		database.query_orig = database.query;
		database.query = queryLog;
	}
	try {
		await database.connect();
		database.on('error', (err: any) => {
			// If shutdown is in progress for PG binary, we won't catch errors. (or we'll get connection reset messages spamming console)
			if (!isShutdownPG()) logger.error(`[DB] Database error : ${err}`);
		});
	} catch(err) {
		logger.error(`[DB] Connection to database server failed : ${err}`);
		throw err;
	}
}

export async function initDB() {
	const conf = getConfig();
	await connectDB({superuser: true, db: 'postgres'});
	try {
		await db().query(`CREATE DATABASE ${conf.Database.prod.database} ENCODING 'UTF8'`);
		logger.info('[DB] Database created');
	} catch(err) {
		logger.debug('[DB] Database already exists');
	}
	try {
		await db().query(`CREATE USER ${conf.Database.prod.user} WITH ENCRYPTED PASSWORD '${conf.Database.prod.password}';`);
		logger.info('[DB] User created');
	} catch(err) {
		logger.debug('[DB] User already exists');
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.Database.prod.database} TO ${conf.Database.prod.user};`);
	// We need to reconnect to create the extension on our newly created database
	await connectDB({superuser: true, db: conf.Database.prod.database});
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

export async function getSettings(): Promise<Settings> {
	const res = await db().query(sql.selectSettings);
	const settings = {};
	// Return an object with option: value.
	res.rows.forEach((e: any) => settings[e.option] = e.value);
	return settings;
}

export async function saveSetting(setting: string, value: string) {
	return await db().query(sql.upsertSetting, [setting, value]);
}

export async function initDBSystem() {
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
		await connectDB();
		await migrateDB();
	} catch(err) {
		throw `Database initialization failed. Check if a postgres binary is already running on that port and kill it? Error : ${err}`;
	}
	if (state.opt.reset) await resetUserData();
	if (!state.opt.noBaseCheck) {
		const karasChecksum = await compareKarasChecksum();
		if (karasChecksum === false) {
			logger.info('[DB] Data files have changed: database generation triggered');
			doGenerate = true;
		}
		// If karasChecksum returns null, it means there were no files to check. We run generation anyway (it'll return an empty database) to avoid making the current startup procedure any more complex.
		if (karasChecksum === null) doGenerate = true;
	}
	const settings = await getSettings();
	if (!doGenerate && !settings.lastGeneration) {
		setConfig({ App: { FirstRun: true }});
		logger.info('[DB] Database is brand new: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) try {
		await generateDatabase();
	} catch(err) {
		logger.error(`[DB] Generation failed : ${err}`);
	}
	logger.debug( '[DB] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(+stats.duration)})`);
	logger.info(`Series       : ${stats.series}`);
	logger.info(`Languages    : ${stats.languages}`);
	logger.info(`Artists      : ${stats.singers} singers, ${stats.songwriters} songwriters, ${stats.creators} creators`);
	logger.info(`Kara Authors : ${stats.authors}`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
	return true;
}

export async function resetUserData() {
	await db().query(sql.resetUserData);
	logger.warn('[DB] User data has been reset!');
}

export async function getStats() {
	const res = await db().query(sql.getStats);
	return res.rows[0];
}

async function generateDatabase() {
	const state = getState();
	try {
		await generateDB();
		logger.info('[DB] Database generation completed successfully!');
		if (state.opt.generateDB) await exit(0);
	} catch(err) {
		logger.error(`[DB] Database generation completed with errors : ${err}`);
		if (state.opt.generateDB) await exit(1);
	}
	return true;
}

export function buildTypeClauses(mode: string, value: any) {
	if (mode === 'search') {
		let search = '';
		const criterias = value.split('!');
		for (const c of criterias) {
			// Splitting only after the first ":"
			const type = c.split(/:(.+)/)[0];
			let values;
			if (type === 's') {
    			values = c.split(/:(.+)/)[1].split(',').map((v: string) => `'%${v}%'`);
    			search = `${search} AND sid::varchar LIKE ${values}`;
			} else {
    			values = c.split(/:(.+)/)[1];
			}
			if (type === 'y') search = `${search} AND year IN (${values})`;
			if (type === 't') search = `${search} AND all_tags_id @> ARRAY[${values}]`;
		}
		return search;
	}
	if (mode === 'kid') return ` AND kid = '${value}'`;
	return '';
}

export async function refreshAll() {
	profile('Refresh');
	await Promise.all([
		refreshKaraSeries(),
		refreshKaraTags()
	]);
	await Promise.all([
		refreshKaraSeriesLang(),
		refreshSeries(),
		refreshKaras(),
		refreshYears(),
		refreshTags()
	]);
	profile('Refresh');
}
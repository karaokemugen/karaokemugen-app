import logger from 'winston/lib/winston';
import {getConfig} from '../_utils/config';
import {Pool} from 'pg';
import {exit} from '../_services/engine';
import {duration} from '../_utils/date';
import deburr from 'lodash.deburr';
import langs from 'langs';
import {compareKarasChecksum, run as generateDB} from '../_services/generation';
import DBMigrate from 'db-migrate';
const sql = require('./sql/database');

export function paramWords(filter) {
	let params = {};
	const words = deburr(filter)
		.toLowerCase()
		.replace('\'', '')
		.replace(',', '')
		.split(' ')
		.filter(s => !('' === s))
		.map(word => {
			return `%${word}%`;
		});
	for (const i in words) {
		params[`word${i}`] = `%${words[i]}%`;
	}
	return params;
}

export function buildClauses(words) {
	const params = paramWords(words);
	let sql = [];
	for (const i in words.split(' ').filter(s => !('' === s))) {
		sql.push(`lower(unaccent(ak.tags)) LIKE :word${i} OR
		lower(unaccent(ak.title)) LIKE :word${i} OR
		lower(unaccent(ak.serie)) LIKE :word${i} OR
		lower(unaccent(ak.serie_altname::varchar)) LIKE :word${i}
		`);
	}
	return {
		sql: sql,
		params: params
	};
}

export function langSelector(lang) {
	const conf = getConfig();
	const userLocale = langs.where('1',lang || conf.EngineDefaultLocale);
	const engineLocale = langs.where('1',conf.EngineDefaultLocale);
	//Fallback to english for cases other than 0 (original name)
	switch(+conf.WebappSongLanguageMode) {
	case 0: return {main: null, fallback: null};
	default:
	case 1: return {main: 'ak.language',fallback: '\'eng\''};
	case 2: return {main: `'${engineLocale['2B']}'`, fallback: '\'eng\''};
	case 3: return {main: `'${userLocale['2B']}'`, fallback: '\'eng\''};
	}
}

export async function transaction(queries) {
	const client = await database.connect();
	try {
		await client.query('BEGIN');
		for (const query of queries) {
			if (Array.isArray(query.params)) {
				for (const param of query.params) {
					await client.query(query.sql, param);
				}
			} else {
				await client.query(query.sql);
			}
		}
		await client.query('COMMIT');
	} catch (e) {
		logger.error(`[DB] Transaction error : ${e}`);
		await client.query('ROLLBACK');
	} finally {
		await client.release();
	}
}

/* Opened DB are exposed to be used by DAO objects. */

let database;

export function db() {
	return database;
}

export async function connectDB(opts = {superuser: false, db: null}) {
	const conf = getConfig();
	const dbConfig = {
		host: conf.db.prod.host,
		user: conf.db.prod.user,
		password: conf.db.prod.password,
		database: conf.db.prod.database
	};
	if (opts.superuser) {
		dbConfig.user = conf.db.prod.superuser;
		dbConfig.password = conf.db.prod.superuserPassword;
		dbConfig.database = opts.db;
	}
	database = new Pool(dbConfig);
	try {
		await database.connect();
		database.on('error', err => {
			logger.error(`[DB] Database error : ${err}`);
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
		await db().query(`CREATE DATABASE ${conf.db.prod.database} ENCODING 'UTF8'`);
		logger.info('[DB] Database created');
	} catch(err) {
		logger.debug('[DB] Database already exists');
	}
	try {
		await db().query(`CREATE USER ${conf.db.prod.user} WITH ENCRYPTED PASSWORD '${conf.db.prod.password}';`);
		logger.info('[DB] User created');
	} catch(err) {
		logger.debug('[DB] User already exists');
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.db.prod.database} to ${conf.db.prod.user};`);
	// We need to reconnect to create the extension on our newly created database
	closeDB();
	await connectDB({superuser: true, db: conf.db.prod.database});
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('[DB] Extension unaccent already registered');
	}
	closeDB();
}

function closeDB() {
	database = null;
}

async function migrateDB() {
	logger.info('[DB] Running migrations if needed');
	const dbm = DBMigrate.getInstance(true, {
		cmdOptions: {
			'migrations-dir': 'src/_dao/migrations',
			'log-level': 'warn|error|info'
		}
	});
	await dbm.sync('all');
}

export async function initDBSystem() {
	let doGenerate;
	const conf = getConfig();
	if (conf.optGenerateDB) doGenerate = true;
	// First login as super user to make sure user, database and extensions are created
	logger.info('[DB] Initializing database connection');
	await initDB();
	await connectDB();
	await migrateDB();
	logger.info('[DB] Checking data files...');
	if (!await compareKarasChecksum()) {
		logger.info('[DB] Kara files have changed: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) await generateDatabase();
	await db().query('VACUUM');
	logger.debug( '[DB] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(stats.duration)})`);
	logger.info(`Series       : ${stats.series}`);
	logger.info(`Languages    : ${stats.languages}`);
	logger.info(`Artists      : ${stats.singers} singers, ${stats.songwriters} songwriters, ${stats.creators} creators`);
	logger.info(`Kara Authors : ${stats.authors}`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
	return true;
}

export async function getStats() {
	const res = await db().query(sql.getStats);
	return res.rows[0];
}

async function generateDatabase() {
	const conf = getConfig();
	try {
		await generateDB(conf);
		logger.info('[DB] Database generation completed successfully!');
		if (conf.optGenerateDB) exit(0);
	} catch(err) {
		logger.error('[DB] Database generation completed with errors!');
		if (conf.optGenerateDB) exit(1);
	}
	return true;
}

export function buildTypeClauses(mode, value) {
	if (mode === 'search') {
		let search = '';
		const criterias = value.split('!');
		for (const c of criterias) {
			// Splitting only after the first ":"
			const type = c.split(/:(.+)/)[0];
			const values = c.split(/:(.+)/)[1];
			if (type === 's') search = `${search} AND serie_id @> ARRAY[${values}]`;
			if (type === 'y') search = `${search} AND year IN (${values})`;
			if (type === 't') search = `${search} AND all_tags_id @> ARRAY[${values}]`;
		}
		return search;
	}
	if (mode === 'kid') return ` AND kid = '${value}'`;
	if (mode === 'kara') return ` AND kara_id = '${value}'`;
	if (mode === 'requests') return `AND kara_id IN (
		SELECT r.fk_id_kara
		FROM request AS r
		LEFT OUTER JOIN user AS u ON u.pk_id_user = r.fk_id_user
		WHERE u.login = '${value}'`;
	return '';
}
import logger from 'winston/lib/winston';
import {getConfig} from '../_common/utils/config';
import {join} from 'path';
import {Pool} from 'pg';
import {exit} from '../_services/engine';
import {duration} from '../_common/utils/date';
import deburr from 'lodash.deburr';
import langs from 'langs';
import {compareKarasChecksum, checkUserdbIntegrity, run as generateDB} from '../_admin/generate_karasdb';
import DBMigrate from 'db-migrate';
const sql = require('../_common/db/database');

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
		params[`$word${i}`] = `%${words[i]}%`;
	}
	return params;
}

export function buildClauses(words,source) {
	const params = paramWords(words);
	let sql = [];
	let extraClauses = '';
	for (const i in words.split(' ').filter(s => !('' === s))) {
		if (source === 'playlist') extraClauses = `OR pc.NORM_pseudo_add LIKE $word${i}`;
		sql.push(`ak.NORM_misc LIKE $word${i} OR
		ak.NORM_title LIKE $word${i} OR
		ak.NORM_author LIKE $word${i} OR
		ak.NORM_serie LIKE $word${i} OR
		ak.NORM_serie_i18n LIKE $word${i} OR
		ak.NORM_serie_altname LIKE $word${i} OR
		ak.NORM_singer LIKE $word${i} OR
		ak.NORM_songwriter LIKE $word${i} OR
		ak.NORM_creator LIKE $word${i} OR
		NORM_serie_orig LIKE $word${i} OR
		ak.language LIKE $word${i}
		${extraClauses}`);
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

export async function connectDB(opts = {superuser: false}) {
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
		dbConfig.database = 'postgres';
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
	try {
		await db().query(`CREATE DATABASE ${conf.db.prod.database} ENCODING 'UTF8'`);
		logger.info('[DB] Database created');
	} catch(err) {
		logger.debug('[DB] Database already exists');
	}
	try {
		await db().query(`CREATE USER ${conf.db.prod.user} WITH ENCRYPTED PASSWORD '${conf.db.password}';`);
		logger.info('[DB] User created');
	} catch(err) {
		logger.debug('[DB] User already exists');
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.db.prod.database} to ${conf.db.prod.user};`);
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('[DB] Extension unaccent already registered');
	}
}

async function closeDB() {
	database = null;
}

async function migrateDB() {
	const dbm = DBMigrate.getInstance(true, {
		cmdOptions: {
			'migrations-dir': 'src/_dao/migrations',
			'log-level': 'warn'
		}
	});
	await dbm.sync('all');
}

export async function initDBSystem() {
	let doGenerate;
	const conf = getConfig();
	if (conf.optGenerateDB) doGenerate = true;
	// First login as super user to make sure user, database and extensions are created
	await connectDB({superuser: true});
	await initDB();
	await closeDB();
	await connectDB();
	await migrateDB();
	logger.info('[DB] Checking data files...');
	if (!await compareKarasChecksum()) {
		logger.info('[DB] Kara files have changed: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) await generateDatabase();
	exit(0);
	/*
	await migrateDB();
	await openUserDatabase();
	await migrateUserDb();
	// Compare Karas checksums if generation hasn't been requested already

	await closeKaraDatabase();
	await Promise.all([
		getUserDb().run(`ATTACH DATABASE "${karaDbFile}" AS karasdb;`),
		getUserDb().run('PRAGMA TEMP_STORE=MEMORY'),
		getUserDb().run('PRAGMA JOURNAL_MODE=WAL'),
		getUserDb().run('PRAGMA SYNCHRONOUS=OFF')
	]);
	await getUserDb().run('VACUUM');
	await compareDatabasesUUIDs();
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
	*/
}

export async function getStats() {
	return await getUserDb().get(sql.getStats);
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

async function migrateUserDb() {
	return await getUserDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/userdata')});
}

async function migrateKaraDb() {
	return await getKaraDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/karasdb')});
}

export function buildTypeClauses(mode, value) {
	if (mode === 'year') return ` AND year = ${value}`;
	if (mode === 'tag') return ` AND kara_id IN (SELECT fk_id_kara FROM kara_tag WHERE fk_id_tag = ${value})`;
	if (mode === 'serie') return ` AND kara_id IN (SELECT fk_id_kara FROM kara_serie WHERE fk_id_serie = ${value})`;
	return '';
}
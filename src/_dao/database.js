import logger from 'winston/lib/winston';
import {open} from 'sqlite';
import {getConfig, setConfig} from '../_utils/config';
import {Pool} from 'pg';
import {exit} from '../_services/engine';
import {duration} from '../_utils/date';
import deburr from 'lodash.deburr';
import langs from 'langs';
import {compareKarasChecksum, run as generateDB} from '../_services/generation';
import DBMigrate from 'db-migrate';
import {join, resolve} from 'path';
import {asyncRename, asyncExists} from '../_utils/files';
import {isShutdownPG, initPG} from '../_utils/postgresql';
import { generateBlacklist } from '../_services/blacklist';
import {refreshYears, refreshKaras} from './kara';
import {refreshTags, refreshKaraTags} from './tag';
import {refreshSeries, refreshKaraSeries} from './series';
import {profile} from '../_utils/logger';


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

async function query(...args) {
	// Do nothing :)
}

export function closeDB() {
	database = {};
	database.query = query;
}

export function buildClauses(words) {
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
	} catch (err) {
		logger.error(`[DB] Transaction error : ${err}`);
		await client.query('ROLLBACK');
		throw err;
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
		port: conf.db.prod.port,
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
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.db.prod.database} TO ${conf.db.prod.user};`);
	// We need to reconnect to create the extension on our newly created database
	await connectDB({superuser: true, db: conf.db.prod.database});
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('[DB] Extension unaccent already registered');
	}
}

async function migrateDB() {
	logger.info('[DB] Running migrations if needed');
	const dbm = DBMigrate.getInstance(true, {
		cmdOptions: {
			'migrations-dir': join(__dirname, '../../migrations/'),
			'log-level': 'warn|error|info'
		}
	});
	await dbm.silence();
	try {
		await dbm.sync('all');
	} catch(err) {
		throw `[DB] Migrations failed : ${err}`;
	}
}

export async function getSettings() {
	const res = await db().query(sql.selectSettings);
	const settings = {};
	res.rows.forEach(e => settings[e.option] = e.value);
	return settings;
}

export async function saveSetting(setting, value) {
	return await db().query(sql.upsertSetting, [setting, value]);
}

export async function initDBSystem() {
	let doGenerate;
	const conf = getConfig();
	if (conf.optGenerateDB) doGenerate = true;
	// First login as super user to make sure user, database and extensions are created
	try {
		if (conf.db.prod.bundledPostgresBinary) {
			await initPG();
			await initDB();
		}
		logger.info('[DB] Initializing database connection');
		await connectDB();
		await migrateDB();
	} catch(err) {
		throw `Database initialization failed : ${err}`;
	}
	if (conf.optReset) await resetUserData();
	await importFromSQLite();
	logger.info('[DB] Checking data files...');
	if (!await compareKarasChecksum()) {
		logger.info('[DB] Data files have changed: database generation triggered');
		doGenerate = true;
	}
	const settings = await getSettings();
	if (!settings.lastGeneration) {
		setConfig({ appFirstRun: 1 });
		logger.info('[DB] Database is brand new: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) try {
		await generateDatabase();
		if (+conf.optGenerateDB) exit(0);
	} catch(err) {
		logger.error(`[DB] Generation failed : ${err}`);
		if (+conf.optGenerateDB) exit(1);
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
			let values;
			if (type === 's') {
    			values = c.split(/:(.+)/)[1].split(',').map((v) => `'${v}'::uuid`);
    			search = `${search} AND serie_id <@ ARRAY[${values}]`;
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

export async function importFromSQLite() {
	const conf = getConfig();
	const sqliteDBFile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	if (await asyncExists(sqliteDBFile)) {
		logger.info('[DB] SQLite database detected. Importing...');
		try {
			const sqliteDB = await open(sqliteDBFile, {verbose: true});
			//Getting data
			const [blc, p, plc, rq, up, u, vc, w, f] = await Promise.all([
				sqliteDB.all('SELECT * FROM blacklist_criteria;'),
				sqliteDB.all('SELECT pk_id_playlist, name,num_karas,length,created_at,modified_at,flag_visible,flag_current,flag_public,flag_favorites,time_left,u.login AS username FROM playlist, user u WHERE u.pk_id_user = fk_id_user AND flag_favorites = 0;'),
				sqliteDB.all('SELECT pk_id_plcontent, fk_id_playlist, kid, created_at, pos, flag_playing, pseudo_add, u.login AS username, flag_free FROM playlist_content, user u WHERE u.pk_id_user = fk_id_user;'),
				sqliteDB.all('SELECT u.login AS username, kid, session_started_at, requested_at FROM request, user u WHERE u.pk_id_user = fk_id_user;'),
				sqliteDB.all('SELECT fk_id_plcontent, u.login AS username FROM upvote, user u WHERE u.pk_id_user = fk_id_user;'),
				sqliteDB.all('SELECT * FROM user;'),
				sqliteDB.all('SELECT * FROM viewcount;'),
				sqliteDB.all('SELECT * FROM whitelist;'),
				sqliteDB.all('SELECT pc.kid as kid, u.login as username FROM playlist_content pc, playlist p, user u WHERE u.pk_id_user = p.fk_id_user AND p.flag_favorites = 1 AND p.pk_id_playlist = pc.fk_id_playlist;')
			]);
			await sqliteDB.close();
			// Transforming data
			const newF = f.map(e => [
				e.username,
				e.kid
			]);
			const newBLC = blc.map(e => [
				e.pk_id_blcriteria,
				e.type,
				e.value,
				e.uniquevalue
			]);
			const newP = p.map(e => [
				e.pk_id_playlist,
				e.name,
				e.num_karas,
				e.length,
				new Date(e.created_at * 1000),
				new Date(e.modified_at * 1000),
				e.flag_visible === 1,
				e.flag_current === 1,
				e.flag_public === 1,
				e.time_left,
				e.username
			]);
			const newPLC = plc.map(e => [
				e.pk_id_plcontent,
				e.fk_id_playlist,
				e.kid,
				new Date(e.created_at * 1000),
				e.pos,
				e.flag_playing === 1,
				e.pseudo_add,
				e.username,
				e.flag_free === 1
			]);
			const newRQ = rq.map(e => [
				e.username,
				e.kid,
				new Date(e.session_started_at * 1000),
				new Date(e.requested_at * 1000)
			]);
			const newUP = up.map(e => [
				e.fk_id_plcontent,
				e.username
			]);
			const newU = u.map(e => [
				e.login,
				e.nickname,
				e.password,
				e.type,
				e.avatar_file,
				e.bio,
				e.url,
				e.email,
				e.flag_online === 1,
				new Date(0),
				e.fingerprint
			]);
			// Admin flag is not needed anymore. Instead admins have type 0
			u.forEach((e,i) => {
				if (e.flag_admin) newU[i][4] = 0;
			});
			const newVC = vc.map(e => [
				new Date(e.session_started_at * 1000),
				e.kid,
				new Date(e.modified_at * 1000)
			]);
			const newW = w.map(e => [
				e.kid,
				new Date(e.created_at * 1000),
				null
			]);
			await transaction([
				{sql: 'TRUNCATE favorites;'},
				{sql: 'TRUNCATE whitelist;'},
				{sql: 'TRUNCATE played;'},
				{sql: 'TRUNCATE users CASCADE;'},
				{sql: 'TRUNCATE upvote RESTART IDENTITY;'},
				{sql: 'TRUNCATE requested'},
				{sql: 'TRUNCATE playlist RESTART IDENTITY CASCADE;'},
				{sql: 'TRUNCATE playlist_content RESTART IDENTITY CASCADE;'},
				{sql: 'TRUNCATE blacklist_criteria RESTART IDENTITY CASCADE;'}
			]);
			await transaction([
				{sql: 'INSERT INTO users VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', params: newU},
				{sql: 'INSERT INTO playlist VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', params: newP},
				{sql: 'INSERT INTO playlist_content VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', params: newPLC},
				{sql: 'INSERT INTO favorites VALUES($1,$2)', params: newF},
				{sql: 'INSERT INTO whitelist VALUES($1,$2,$3)', params: newW},
				{sql: 'INSERT INTO played VALUES($1,$2,$3)', params: newVC},
				{sql: 'INSERT INTO upvote VALUES($1,$2)', params: newUP},
				{sql: 'INSERT INTO requested VALUES($1,$2,$3,$4)', params: newRQ},
				{sql: 'INSERT INTO blacklist_criteria VALUES($1,$2,$3,$4)', params: newBLC}
			]);
			await db().query(`
			SELECT SETVAL('blacklist_criteria_pk_id_blcriteria_seq',(SELECT MAX(pk_id_blcriteria) FROM blacklist_criteria));
			SELECT SETVAL('playlist_pk_id_playlist_seq',(SELECT MAX(pk_id_playlist) FROM playlist));
			SELECT SETVAL('playlist_content_pk_id_plcontent_seq',(SELECT MAX(pk_id_plcontent) FROM playlist_content));
			`);
			await generateBlacklist();
			logger.info('[DB] SQLite import complete');
			await asyncRename(sqliteDBFile, sqliteDBFile+'-old');
		} catch(err) {
			logger.error(`[DB] Your old SQLite database could not be imported : ${err}`);
		}
	}
}

export async function refreshAll() {
	profile('Refresh');
	await Promise.all([
		refreshKaraSeries(),
		refreshKaraTags()
	]);
	await Promise.all([
		refreshSeries(),
		refreshKaras(),
		refreshYears(),
		refreshTags()
	]);
	profile('Refresh');
}
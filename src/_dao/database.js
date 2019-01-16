import logger from 'winston/lib/winston';
import {open} from 'sqlite';
import {getConfig} from '../_utils/config';
import {Pool} from 'pg';
import {exit} from '../_services/engine';
import {duration} from '../_utils/date';
import deburr from 'lodash.deburr';
import langs from 'langs';
import {compareKarasChecksum, run as generateDB} from '../_services/generation';
import DBMigrate from 'db-migrate';
import {resolve} from 'path';
import {asyncRename, asyncExists} from '../_utils/files';
import {dumpPG, initPG} from '../_utils/postgresql';
import {on} from '../_utils/pubsub';

const sql = require('./sql/database');

let shutdownInProgress = false;

on('postgresShutdownInProgress', () => {
	shutdownInProgress = true;
});

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
			if (!shutdownInProgress) logger.error(`[DB] Database error : ${err}`);
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
	closeDB();
	await connectDB({superuser: true, db: conf.db.prod.database});
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('[DB] Extension unaccent already registered');
	}
	closeDB();
}

export function closeDB() {
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
		logger.info('[DB] Kara files have changed: database generation triggered');
		doGenerate = true;
	}
	const settings = await getSettings();
	if (!settings.lastGeneration) doGenerate = true;
	if (doGenerate) await generateDatabase();
	logger.debug( '[DB] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(stats.duration)})`);
	logger.info(`Series       : ${stats.series}`);
	logger.info(`Languages    : ${stats.languages}`);
	logger.info(`Artists      : ${stats.singers} singers, ${stats.songwriters} songwriters, ${stats.creators} creators`);
	logger.info(`Kara Authors : ${stats.authors}`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
	await dumpPG();
	console.log('Dumped')
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

export async function importFromSQLite() {
	const conf = getConfig();
	const sqliteDBFile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	if (await asyncExists(sqliteDBFile)) {
		logger.info('[DB] SQLite database detected. Importing...');
		const sqliteDB = await open(sqliteDBFile, {verbose: true});
		//Getting data
		const [blc, p, plc, rq, up, u, vc, w] = await Promise.all([
			sqliteDB.all('SELECT * FROM blacklist_criteria;'),
			sqliteDB.all('SELECT * FROM playlist;'),
			sqliteDB.all('SELECT * FROM playlist_content;'),
			sqliteDB.all('SELECT * FROM request;'),
			sqliteDB.all('SELECT * FROM upvote;'),
			sqliteDB.all('SELECT * FROM user;'),
			sqliteDB.all('SELECT * FROM viewcount;'),
			sqliteDB.all('SELECT * FROM whitelist;')
		]);
		await sqliteDB.close();
		// Transforming data
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
			e.flag_favorites === 1,
			e.time_left,
			e.fk_id_user
		]);
		const newPLC = plc.map(e => [
			e.pk_id_plcontent,
			e.fk_id_playlist,
			e.fk_id_kara,
			e.kid,
			new Date(e.created_at * 1000),
			e.pos,
			e.flag_playing === 1,
			e.pseudo_add,
			e.fk_id_user,
			e.flag_free === 1
		]);
		const newRQ = rq.map(e => [
			e.pk_id_request,
			e.fk_id_user,
			e.fk_id_kara,
			new Date(e.session_started_at * 1000),
			e.kid,
			new Date(e.requested_at * 1000)
		]);
		const newUP = up.map(e => [
			e.fk_id_plcontent,
			e.fk_id_user
		]);
		const newU = u.map(e => [
			e.pk_id_user,
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
			e.pk_id_viewcount,
			e.fk_id_kara,
			new Date(e.session_started_at * 1000),
			e.kid,
			new Date(e.modified_at * 1000)
		]);
		const newW = w.map(e => [
			w.pk_id_whitelist,
			e.fk.id_kara,
			e.kid,
			new Date(e.created_at * 1000),
			null
		]);
		await transaction([
			{sql: 'INSERT INTO whitelist VALUES($1,$2,$3,$4,$5)', params: newW},
			{sql: 'INSERT INTO played VALUES($1,$2,$3,$4,$5)', params: newVC},
			{sql: 'INSERT INTO users VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', params: newU},
			{sql: 'INSERT INTO upvote VALUES($1,$2)', params: newUP},
			{sql: 'INSERT INTO requested VALUES($1,$2,$3,$4,$5,$6)', params: newRQ},
			{sql: 'INSERT INTO playlist VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', params: newP},
			{sql: 'INSERT INTO playlist_content VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', params: newPLC},
			{sql: 'INSERT INTO blacklist_criteria VALUES($1,$2,$3,$4)', params: newBLC}
		]);
		await db().query(`
		SELECT SETVAL('blacklist_criteria_pk_id_blcriteria_seq',(SELECT MAX(pk_id_blcriteria) FROM blacklist_criteria));
		SELECT SETVAL('played_pk_id_played_seq',(SELECT MAX(pk_id_played) FROM played));
		SELECT SETVAL('playlist_pk_id_playlist_seq',(SELECT MAX(pk_id_playlist) FROM playlist));
		SELECT SETVAL('playlist_content_pk_id_plcontent_seq',(SELECT MAX(pk_id_plcontent) FROM playlist_content));
		SELECT SETVAL('requested_pk_id_requested_seq',(SELECT MAX(pk_id_requested) FROM requested));
		SELECT SETVAL('users_pk_id_user_seq',(SELECT MAX(pk_id_user) FROM users));
		SELECT SETVAL('whitelist_pk_id_whitelist_seq',(SELECT MAX(pk_id_whitelist) FROM whitelist));
		`);
		logger.info('[DB] SQLite import complete');
		await asyncRename(sqliteDBFile, sqliteDBFile+'-old');
	}
}
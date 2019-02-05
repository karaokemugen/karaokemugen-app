import {buildTypeClauses, langSelector, buildClauses, db, transaction} from './database';
import {now} from 'unix-timestamp';
import {getConfig} from '../_utils/config';
import {resolve} from 'path';
import {asyncExists, asyncReadFile} from '../_utils/files';
import { getState } from '../_utils/state';
import {pg as yesql} from 'yesql';
import logger from 'winston';

const sql = require('./sql/kara');

export async function getSongCountForUser(playlist_id,username) {
	const res = await db().query(sql.getSongCountPerUser, [playlist_id, username]);
	return res.rows[0];
}

export async function refreshKaras() {
	logger.profile('RefreshKaras');
	await db().query('REFRESH MATERIALIZED VIEW all_karas');
	logger.profile('RefreshKaras');
}

export async function refreshYears() {
	logger.profile('RefreshYears');
	await db().query('REFRESH MATERIALIZED VIEW all_years');
	logger.profile('RefreshYears');
}


export async function getYears() {
	const res = await db().query(sql.getYears);
	return res.rows;
}

export async function updateKara(kara) {
	await db().query(yesql(sql.updateKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.order || null,
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: new Date(kara.datemodif * 1000),
		kid: kara.KID
	}));
}

export async function addKara(kara) {
	await db().query(yesql(sql.insertKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.order || null,
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: new Date(kara.datemodif * 1000),
		created_at: new Date(kara.dateadded * 1000),
		kid: kara.KID
	}));
}

export async function getSongTimeSpentForUser(playlist_id,username) {
	const res = await db().query(sql.getTimeSpentPerUser,[
		playlist_id,
		username
	]);
	return res.rows[0];
}

export async function getKara(kid, username, lang, role, view) {
	const res = await selectAllKaras(username, null, lang, 'kid', kid, null, null, role === 'admin', view);
	return res;
}

export async function selectAllKaras(username, filter, lang, mode, modeValue, from = 0, size = 0, admin = true, view) {
	let filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	let typeClauses = mode ? buildTypeClauses(mode, modeValue) : '';
	// Hide blacklisted songs if not admin
	if (!admin) typeClauses = typeClauses + ' AND ak.kid NOT IN (SELECT fk_kid FROM blacklist)';
	let orderClauses = '';
	let limitClause = '';
	let offsetClause = '';
	let havingClause = '';
	let viewClause = '';
	if (view) viewClause = 'v_';
	if (mode === 'recent') orderClauses = 'created_at DESC, ';
	if (mode === 'requested') {
		orderClauses = 'requested DESC, ';
		havingClause = 'HAVING COUNT(rq.*) > 1';
	}
	if (mode === 'played') {
		orderClauses = 'played DESC, ';
		havingClause = 'HAVING COUNT(p.*) > 1';
	}
	//Disabled until we get the frontend to work around this.
	//if (from > 0) offsetClause = `OFFSET ${from} `;
	//if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getAllKaras(filterClauses.sql, langSelector(lang), typeClauses, orderClauses, havingClause, limitClause, offsetClause, viewClause);
	const params = {
		dejavu_time: new Date((now() - (getConfig().EngineMaxDejaVuTime * 60)) * 1000),
		username: username,
		...filterClauses.params
	};
	const res = await db().query(yesql(query)(params));
	return res.rows;
}

export async function getKaraHistory(view) {
	let viewClause = '';
	if (view) viewClause = 'v_';
	const res = await db().query(sql.getKaraHistory(viewClause));
	return res.rows;
}

export async function updateFreeOrphanedSongs(expireTime) {
	return await db().query(sql.updateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function getKaraMini(kid) {
	const res = await db().query(sql.getKaraMini, [kid]);
	return res.rows[0];
}

export async function getASS(sub) {
	const conf = getConfig();
	const subfile = resolve(conf.appPath,conf.PathSubs,sub);
	if (await asyncExists(subfile)) return await asyncReadFile(subfile, 'utf-8');
	throw 'Subfile not found';
}

export async function isKara(kid) {
	const res = await db().query(sql.isKara, [kid]);
	return res.rows[0];
}

export async function isKaraInPlaylist(kid,playlist_id) {
	const res = await db().query(yesql(sql.isKaraInPlaylist)({
		kid: kid,
		playlist_id: playlist_id
	}));
	return res.rows.length > 0;
}

export async function addPlayed(kid) {
	return await db().query(yesql(sql.addViewcount)({
		kid: kid,
		played_at: new Date(),
		started_at: getState().sessionStart
	}));
}

export async function addKaraToRequests(username,karaList) {
	const karas = karaList.map((kara) => ([
		username,
		kara.kid,
		new Date(),
		getState().sessionStart
	]));
	return await transaction([{params: karas, sql: sql.addRequested}]);
}

export async function resetViewcounts() {
	return await db().query(sql.resetViewcounts);
}

export async function addKaraToPlaylist(karaList) {
	const karas = karaList.map((kara) => ([
		kara.playlist_id,
		kara.username,
		kara.nickname,
		kara.kid,
		kara.created_at,
		kara.pos
	]));
	return await transaction([{params: karas, sql: sql.addKaraToPlaylist}]);
}

export async function removeKaraFromPlaylist(karas, playlist_id) {
	return await db().query(sql.removeKaraFromPlaylist.replace(/\$playlistcontent_id/,karas.join(',')), [playlist_id]);
}

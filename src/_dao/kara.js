import {buildTypeClauses, langSelector, buildClauses, db, transaction} from './database';
import {now} from 'unix-timestamp';
import {getConfig} from '../_utils/config';
import {resolve} from 'path';
import {asyncExists, asyncReadFile} from '../_utils/files';
import { getState } from '../_utils/state';
import {pg as yesql} from 'yesql';

const sql = require('./sql/kara');

export async function getSongCountForUser(playlist_id,user_id) {
	const res = await db().query(sql.getSongCountPerUser, [playlist_id, user_id]);
	return res.rows[0];
}

export async function refreshKaras() {
	return await db().query('REFRESH MATERIALIZED VIEW all_karas');
}

export async function refreshYears() {
	return await db().query('REFRESH MATERIALIZED VIEW all_years');
}


export async function getYears() {
	const res = await db().query(sql.getYears);
	return res.rows;
}

export async function updateKara(kara) {
	await db().query(sql.updateKara, {
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.order || '',
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: new Date(kara.datemodif * 1000),
		kara_id: kara.kara_id
	});
	await Promise.all([
		refreshKaras(),
		refreshYears()
	]);
}

export async function addKara(kara) {
	const res = await db().query(sql.insertKara, {
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.order || '',
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: new Date(kara.datemodif * 1000),
		kara_id: kara.kara_id,
		created_at: new Date(kara.dateadded * 1000),
		kid: kara.KID
	});
	await Promise.all([
		refreshKaras(),
		refreshYears()
	]);
	return res.rows[0].pk_id_kara;
}

export async function getSongTimeSpentForUser(playlist_id,user_id) {
	const res = await db().query(sql.getTimeSpentPerUser,[
		playlist_id,
		user_id
	]);
	return res.rows[0];
}

export async function getKara(kara_id, username, lang, role) {
	const res = await selectAllKaras('admin', null, lang, 'kara', kara_id, role === 'admin');
	return res[0];
}

export async function selectAllKaras(username, filter, lang, mode, modeValue, from = 0, size = 0, admin = true) {
	let filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	let typeClauses = mode ? buildTypeClauses(mode, modeValue) : '';
	// Hide blacklisted songs if not admin
	if (!admin) typeClauses = typeClauses + ' AND ak.kara_id NOT IN (SELECT fk_id_kara FROM blacklist)';
	let orderClauses = '';
	let limitClause = '';
	let offsetClause = '';
	if (mode === 'recent') orderClauses = 'created_at DESC, ';
	if (mode === 'history') orderClauses = 'lastplayed_at DESC, ';
	if (mode === 'requested') {
		orderClauses = 'requested DESC, ';
		filterClauses = {
			sql: ['requested > :requested'],
			params: {
				requested: 1
			}
		};
	}
	if (mode === 'played') {
		orderClauses = 'played DESC, ';
		filterClauses = {
			sql: ['played > :played'],
			params: {
				played: 1
			}
		};
	}
	//Disabled until we get the frontend to work around this.
	//if (from > 0) offsetClause = `OFFSET ${from} `;
	//if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getAllKaras(filterClauses.sql, langSelector(lang), typeClauses, orderClauses, limitClause, offsetClause);
	const params = {
		dejavu_time: new Date((now() - (getConfig().EngineMaxDejaVuTime * 60)) * 1000),
		username: username,
		...filterClauses.params
	};
	const res = await db().query(yesql(query)(params));
	return res.rows;
}

export async function updateFreeOrphanedSongs(expireTime) {
	return await db().query(sql.updateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function getKaraMini(id) {
	const res = await db().query(sql.getKaraMini, [id]);
	return res.rows[0];
}

export async function getKaraByKID(kid) {
	return await selectAllKaras('admin', null, 'eng', 'kid', kid);
}

export async function getASS(sub) {
	const conf = getConfig();
	const subfile = resolve(conf.appPath,conf.PathSubs,sub);
	if (await asyncExists(subfile)) return await asyncReadFile(subfile, 'utf-8');
	throw 'Subfile not found';
}

export async function isKara(id) {
	const res = await db().query(sql.isKara, [id]);
	return res.rows[0];
}

export async function isKaraInPlaylist(kara_id,playlist_id) {
	const res = await db().query(yesql(sql.isKaraInPlaylist)({
		kara_id: kara_id,
		playlist_id: playlist_id
	}));
	return res.rows.length > 0;
}

export async function addViewcount(kara_id,kid) {
	return await db().query(yesql(sql.addViewcount)({
		kara_id: kara_id,
		kid: kid,
		played_at: new Date(),
		started_at: new Date(getState().sessionStart * 1000)
	}));
}

export async function addKaraToRequests(user_id,karaList) {
	const karas = karaList.map((kara) => ([
		user_id,
		kara.kara_id,
		new Date(),
		new Date(getState().sessionStart * 1000)
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
		kara.kara_id,
		new Date(kara.created_at * 1000),
		kara.pos
	]));
	return await transaction([{params: karas, sql: sql.addKaraToPlaylist}]);
}

export async function removeKaraFromPlaylist(karaList, playlist_id) {
	for (const i in karaList) {
		karaList[i] = +karaList[i];
	}
	const karas = karaList.join(',');
	return await db().query(sql.removeKaraFromPlaylist.replace(/\$playlistcontent_id/,karas), [playlist_id]);
}

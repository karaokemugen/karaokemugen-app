import {buildTypeClauses, langSelector, buildClauses, getUserDb, transaction} from './database';
import {now} from 'unix-timestamp';
import {getConfig} from '../_utils/config';
import {resolve} from 'path';
import {asyncExists, asyncReadFile} from '../_utils/files';
import deburr from 'lodash.deburr';
import { getState } from '../_utils/state';

const sql = require('./sql/kara');

export async function getSongCountForUser(playlist_id,user_id) {
	return await getUserDb().get(sql.getSongCountPerUser, {
		$playlist_id: playlist_id,
		$user_id: user_id
	});
}

export async function getYears() {
	return await getUserDb().all(sql.getYears);
}

export async function updateKara(kara) {
	return await getUserDb().get(sql.updateKara, {
		$karafile: kara.karafile,
		$mediafile: kara.mediafile,
		$subfile: kara.subfile,
		$title: kara.title,
		$NORM_title: deburr(kara.title),
		$year: kara.year,
		$songorder: kara.order || '',
		$duration: kara.mediaduration,
		$gain: kara.mediagain,
		$modified_at: kara.datemodif,
		$kara_id: kara.kara_id
	});
}

export async function addKara(kara) {
	const res = await getUserDb().run(sql.insertKara, {
		$karafile: kara.karafile,
		$mediafile: kara.mediafile,
		$subfile: kara.subfile,
		$title: kara.title,
		$NORM_title: deburr(kara.title),
		$year: kara.year,
		$songorder: kara.order || '',
		$duration: kara.mediaduration,
		$gain: kara.mediagain,
		$modified_at: kara.datemodif,
		$kara_id: kara.kara_id,
		$created_at: kara.dateadded,
		$kid: kara.KID
	});
	return res.lastID;
}

export async function getSongTimeSpentForUser(playlist_id,user_id) {
	return await getUserDb().get(sql.getTimeSpentPerUser, {
		$playlist_id: playlist_id,
		$user_id: user_id
	});
}

export async function getAllKaras(username, filter, lang, mode, modeValue) {
	const filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	const typeClauses = mode ? buildTypeClauses(mode, modeValue) : '';
	let orderClauses = '';
	if (mode === 'recent') orderClauses = 'created_at DESC, ';
	if (mode === 'popular') orderClauses = 'requested DESC, ';
	const query = sql.getAllKaras(filterClauses.sql, langSelector(lang), orderClauses, typeClauses);
	const params = {
		$dejavu_time: now() - (getConfig().EngineMaxDejaVuTime * 60),
		$username: username,
		...filterClauses.params
	};
	return await getUserDb().all(query, params);
}


export async function updateFreeOrphanedSongs(expireTime) {
	return await getUserDb().run(sql.updateFreeOrphanedSongs, { $expire_time: expireTime });
}

export async function getKaraMini(id) {
	return await getUserDb().get(sql.getKaraMini, { $kara_id: id });
}

export async function getKaraByKID(kid) {
	return await getUserDb().get(sql.getKaraByKID, { $kid: kid });
}

export async function getKaraHistory() {
	return await getUserDb().all(sql.getKaraHistory);
}

export async function getKaraViewcounts() {
	return await getUserDb().all(sql.getKaraViewcounts);
}

export async function getKara(id, username, lang) {
	const query = sql.getKara(langSelector(lang));
	return await getUserDb().get(query,
		{
			$kara_id: id,
			$dejavu_time: now() - (getConfig().EngineMaxDejaVuTime * 60),
			$username: username
		});
}

export async function getASS(sub) {
	const conf = getConfig();
	const subfile = resolve(conf.appPath,conf.PathSubs,sub);
	if (await asyncExists(subfile)) return await asyncReadFile(subfile, 'utf-8');
	throw 'Subfile not found';
}

export async function isKara(id) {
	return await getUserDb().get(sql.isKara, { $kara_id: id });
}

export async function isKaraInPlaylist(kara_id,playlist_id) {
	const res = await getUserDb().get(sql.isKaraInPlaylist, {
		$kara_id: kara_id,
		$playlist_id: playlist_id
	});
	return !!res;
}

export async function addViewcount(kara_id,kid) {
	return await getUserDb().run(sql.addViewcount, {
		$kara_id: kara_id,
		$kid: kid,
		$modified_at: now(),
		$started_at: getState().sessionStart
	});
}

export async function addKaraToRequests(user_id,karaList) {
	const karas = karaList.map((kara) => ({
		$user_id: user_id,
		$kara_id: kara.kara_id,
		$requested_at: now(),
		$started_at: getState().sessionStart
	}));
	return await transaction(karas, sql.addRequested);
}

export async function resetViewcounts() {
	return await getUserDb().run(sql.resetViewcounts);
}

export async function addKaraToPlaylist(karaList) {
	const karas = karaList.map((kara) => ({
		$playlist_id: kara.playlist_id,
		$username: kara.username,
		$pseudo_add: kara.pseudo_add,
		$NORM_pseudo_add: kara.NORM_pseudo_add,
		$kara_id: kara.kara_id,
		$created_at: kara.created_at,
		$pos: kara.pos
	}));
	return await transaction(karas, sql.addKaraToPlaylist);
}

export async function removeKaraFromPlaylist(karaList, playlist_id) {
	// We're not using SQLite parameterization due to a limitation
	// keeping us from feeding a simple array/list to the statement.
	// Coercing data received into numbers. You never know.
	for (const i in karaList) {
		karaList[i] = +karaList[i];
	}
	const karas = karaList.join(',');
	return await getUserDb().run(sql.removeKaraFromPlaylist.replace(/\$playlistcontent_id/,karas), {$playlist_id: playlist_id});
}

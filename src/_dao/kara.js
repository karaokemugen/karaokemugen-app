import {langSelector, buildClauses, getUserDb, transaction} from './database';
import {now} from 'unix-timestamp';
import {getConfig} from '../_common/utils/config';
import {resolve} from 'path';
import {asyncExists, asyncReadFile} from '../_common/utils/files';

const sql = require('../_common/db/kara');

export async function getSongCountForUser(playlist_id,user_id) {
	return await getUserDb().get(sql.getSongCountPerUser, {
		$playlist_id: playlist_id,
		$user_id: user_id
	});
}

export async function getSongTimeSpentForUser(playlist_id,user_id) {
	return await getUserDb().get(sql.getTimeSpentPerUser, {
		$playlist_id: playlist_id,
		$user_id: user_id
	});
}

export async function getAllKaras(username, filter, lang) {

	const filterClauses = filter ? buildClauses(filter) : [];
	const query = sql.getAllKaras(filterClauses, langSelector(lang));

	return await getUserDb().all(query, {
		$dejavu_time: now() - (getConfig().EngineMaxDejaVuTime * 60),
		$username: username
	});
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

export async function getKara(id, username) {
	return await getUserDb().get(sql.getKara,
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

export async function addViewcount(kara_id,kid,datetime) {
	return await getUserDb().run(sql.addViewcount, {
		$kara_id: kara_id,
		$kid: kid,
		$modified_at: datetime
	});
}

export async function addKaraToRequests(user_id,karaList,date_add) {
	const karas = karaList.map((kara) => ({
		$user_id: user_id,
		$kara_id: kara.kara_id,
		$requested_at: date_add,		
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

export async function addKaraToWhitelist(karaList,date_added) {
	const karas = karaList.map((kara) => ({
		$kara_id: kara,
		$created_at: date_added
	}));
	return await transaction(karas, sql.addKaraToWhitelist);
}

export async function removeKaraFromPlaylist(karaList, playlist_id) {
	// We're not using SQLite parameterization due to a limitation 
	// keeping us from feeding a simple array/list to the statement.			
	const karas = karaList.join(',');
	const sqlRemoveKaraFromPlaylist = sql.removeKaraFromPlaylist.replace(/\$playlistcontent_id/,karas);
	return await getUserDb().run(sqlRemoveKaraFromPlaylist, {$playlist_id: playlist_id});
}

export async function removeKaraFromWhitelist(wlcList) {
	const wlcs = wlcList.map((wlc) => ({ $wlc_id: wlc.wlc_id }));
	return await transaction(wlcs, sql.removeKaraFromWhitelist);
}
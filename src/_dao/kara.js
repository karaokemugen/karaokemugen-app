import {getUserDb, transaction} from './database';
import {now} from 'unix-timestamp';
import {getConfig} from '../_common/utils/config';
const sql = require('../_common/db/kara');

export async function getSongCountForUser(playlist_id,username) {
	return await getUserDb().get(sql.getSongCountPerUser, {
		$playlist_id: playlist_id,
		$username: username
	});
}

export async function getAllKaras() {
	return await getUserDb().all(sql.getAllKaras, {
		$dejavu_time: now() - (getConfig().EngineMaxDejaVuTime * 60)
	});
}

export async function getKara(id) {
	return await getUserDb().get(sql.getKara,
		{
			$kara_id: id,
			$dejavu_time: now() - (getConfig().EngineMaxDejaVuTime * 60)
		});
}

export async function getASS(id) {
	return await getUserDb().get(sql.getASS, { $kara_id: id });
}

export async function getKaraByKID(kid) {
	return await getUserDb().get(sql.getKaraByKID, { $kid: kid });
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

export async function updateTotalViewcounts(kid) {
	return await getUserDb().run(sql.updateTotalViewcounts, { $kid: kid });
}

export async function addKaraToPlaylist(karaList) {
	const karas = karaList.map((kara) => ({
		$playlist_id: kara.playlist_id,
		$user_id: kara.user_id,
		$kara_id: kara.kara_id,
		$created_at: kara.date_add,
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

export async function removeKaraFromPlaylist(karaList) {
	// We're not using SQLite parameterization due to a limitation 
	// keeping us from feeding a simple array/list to the statement.			
	const karas = karaList.join(',');
	const sqlRemoveKaraFromPlaylist = sql.removeKaraFromPlaylist.replace(/\$playlistcontent_id/,karas);
	return await getUserDb().run(sqlRemoveKaraFromPlaylist);
}

export async function removeKaraFromWhitelist(wlcList) {
	const wlcs = wlcList.map((wlc) => ({ $wlc_id: wlc.wlc_id }));
	return await transaction(wlcs, sql.removeKaraFromWhitelist);
}
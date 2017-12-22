import {getUserDb, transaction} from './database';
import {now} from 'unix-timestamp';
import {getConfig} from '../_common/utils/config';
const sql = require('../_common/db/kara');

export async function getSongCountPerUser(playlist_id,username) {
	return await getUserDb().get(sql.getSongCountPerUser,
		{
			$playlist_id: playlist_id,
			$username: username		
		});
}

export async function getAllKaras() {
	return await getUserDb().all(sql.getAllKaras);
}

export async function getKara(id) {
	const conf = getConfig();
	return await getUserDb().get(sql.getKara,
		{
			$kara_id: id,
			$dejavu_time: now() - (conf.EngineMaxDejaVuTime * 60)
		});
}

export async function getASS(id) {
	return await getUserDb().get(sql.getASS,
		{
			$kara_id: id,
		});
}

export async function getKaraByKID(kid) {
	const conf = getConfig();
	return await getUserDb().get(sql.getKaraByKID,
		{
			$kid: kid,
			$dejavu_time: now() - (conf.EngineMaxDejaVuTime * 60)
		});
}

export async function isKara(id) {
	const res = await getUserDb().get(sql.isKara,
		{
			$kara_id: id
		});
	//FIXME: Logic here until ES2015+ everywhere
	if (res) return true;
	return false;
}

export async function isKaraInPlaylist(kara_id,playlist_id) {
	const res = await getUserDb().get(sql.isKaraInPlaylist,
		{
			$kara_id: kara_id,
			$playlist_id: playlist_id
		});
	//FIXME: Logic here until ES2015+ everywhere
	if (res) return true;
	return false;
}

export async function isKaraInWhitelist(kara_id) {
	const res = await getUserDb().get(sql.isKaraInWhitelist,
		{
			$kara_id: kara_id			
		});
	//FIXME: Logic here until ES2015+ everywhere
	if (res) return true;
	return false;
}

export async function isKaraInBlacklist(kara_id) {
	const res = await getUserDb().get(sql.isKaraInBlacklist,
		{
			$kara_id: kara_id			
		});
	//FIXME: Logic here until ES2015+ everywhere
	if (res) return true;
	return false;
}

export async function addViewcount(kara_id,kid,datetime) {
	return await getUserDb().run(sql.addViewcount,
		{
			$kara_id: kara_id,
			$kid: kid,
			$modified_at: datetime
		});
}

export async function updateTotalViewcounts(kid) {
	return await getUserDb().run(sql.updateTotalViewcounts, 
		{
			$kid: kid
		});
}

export async function addKaraToPlaylist(karaList) {
	let karas = [];
	karaList.forEach((kara) => {				
		karas.push({
			$playlist_id: kara.playlist_id,
			$pseudo_add: kara.requester,
			$NORM_pseudo_add: kara.NORM_requester,
			$kara_id: kara.kara_id,
			$created_at: kara.date_add,
			$pos: kara.pos,					
		});
	});	
	return await transaction(karas, sql.addKaraToPlaylist);
}

export async function addKaraToWhitelist(karaList,date_added) {
	let karas = [];
	karaList.forEach((kara) => {				
		karas.push({
			$kara_id: kara,
			$created_at: date_added,			
		});
	});	
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
	let wlcs = [];
	wlcList.forEach((kara) => {				
		wlcs.push({
			$wlc_id: kara.wlc_id,
		});
	});	
	return await transaction(wlcs, sql.removeKaraFromWhitelist);
}


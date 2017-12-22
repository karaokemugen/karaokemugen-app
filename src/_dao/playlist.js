import {getUserDb, transaction} from './database';
import {getConfig} from '../_common/utils/config';
import {now} from 'unix-timestamp';
const sql = require('../_common/db/playlist');

export async function countKarasInPlaylist(id) {
	return await getUserDb().get(sql.countKarasInPlaylist, 
		{
			$playlist_id: id
		});
}

export async function editPlaylist(pl) {
	return await getUserDb().run(sql.editPlaylist,
		{
			$playlist_id: pl.id,
			$name: pl.name,
			$NORM_name: pl.NORM_name,
			$modified_at: pl.modified_at,
			$flag_visible: pl.flag_visible,
		});
}

export async function createPlaylist(pl) {
	return await getUserDb().run(sql.createPlaylist,
		{
			$playlist_id: pl.id,
			$name: pl.name,
			$NORM_name: pl.NORM_name,
			$created_at: pl.created_at,
			$modified_at: pl.modified_at,
			$flag_visible: pl.flag_visible,
			$flag_current: pl.flag_current,
			$flag_public: pl.flag_public
		});
}

export async function emptyPlaylist(id) {
	return await getUserDb().run(sql.emptyPlaylist, 
		{
			$playlist_id: id
		});
}

export async function deletePlaylist(id) {
	return await getUserDb().run(sql.deletePlaylist, 
		{
			$playlist_id: id
		});
}

export async function updatePlaylistKaraCount(id,karaCount) {
	return await getUserDb().run(sql.updatePlaylistKaraCount,
		{
			$playlist_id: id,
			$kara_count: karaCount
		});
}

export async function updatePlaylistLastEditTime(id,timestamp) {
	return await getUserDb().run(sql.updatePlaylistLastEditTime,
		{
			$playlist_id: id,
			$modified_at: timestamp
		});
}

export async function getPLCByDate(playlist_id,date) {
	return await getUserDb().get(sql.getPLCByDate,
		{
			$playlist_id: playlist_id,
			$date_added: date
		});
}

export async function shiftPosInPlaylist(id,pos,shift) {
	return await getUserDb().run(sql.shiftPosInPlaylist,
		{
			$shift: shift,
			$playlist_id: id,
			$pos: pos
		});
}

export async function getMaxPosInPlaylist(id) {
	return await getUserDb().get(sql.getMaxPosInPlaylist,
		{
			$playlist_id: id
		});
}	

export async function reorderPlaylist(playlist_id,playlist) {
	let newpos = 0;
	let karaList = [];	
	playlist.forEach((kara) => {				
		newpos++;
		karaList.push({
			$pos: newpos,	
			$playlistcontent_id: kara.playlistcontent_id
		});
	});
	return await transaction(karaList,sql.updatePLCSetPos);	
}

export async function setPos(plc_id,pos) {
	return await getUserDb().run(sql.updatePLCSetPos, 
		{
			$pos: pos,
			$playlistcontent_id: plc_id
		});
}

export async function updatePlaylistDuration(id) {
	return await getUserDb().run(sql.updatePlaylistDuration, 
		{
			$playlist_id: id
		});
}

export async function getPlaylistContents(id,forPlayer) {
	// If forPlayer is set, return only the information needed
	let query = sql.getPlaylistContents;
	const conf = getConfig();
	if (forPlayer) query = sql.getPlaylistContentsForPlayer;
	return await getUserDb().all(query,  
		{
			$playlist_id: id,
			$dejavu_time: now() - (conf.EngineMaxDejaVuTime * 60)
		});
}

export async function getPlaylistPos(id) {
	return await getUserDb().all(sql.getPlaylistPos, 
		{
			$playlist_id: id
		});
}

export async function getPLCInfo(id,forUser) {
	const conf = getConfig();
	let query = sql.getPLCInfo;
	if (forUser) query += ' AND p.flag_visible = 1';
	return await getUserDb().get(query,  
		{
			$playlistcontent_id: id,
			$dejavu_time: now() - (conf.EngineMaxDejaVuTime * 60)
		});
}

export async function getPLCByKID(kid,playlist_id) {
	const conf = getConfig();
	return await getUserDb().get(sql.getPLCByKID,
		{
			$kid: kid,
			$playlist_id: playlist_id,
			$dejavu_time: now() - (conf.EngineMaxDejaVuTime * 60)
		});
}

export async function getPlaylistInfo(id,forUser) {
	let query = sql.getPlaylistInfo;
	if (forUser) query += ' AND flag_visible = 1';
	return await getUserDb().get(query,
		{
			$playlist_id: id
		});
}

export async function getPlaylists(forUser) {
	let query = sql.getPlaylists ;
	if (forUser) { 
		query += ' WHERE flag_visible = 1 ORDER BY flag_current DESC, flag_public DESC, name';
	} else {
		query += ' ORDER BY flag_current DESC, flag_public DESC, name';
	}
	return await getUserDb().all(query);
}

export async function findCurrentPlaylist() {
	return await getUserDb().get(sql.testCurrentPlaylist);
}

export async function findPublicPlaylist() {
	return await getUserDb().get(sql.testPublicPlaylist);
}

export async function raisePosInPlaylist(pos,id) {
	return await getUserDb().run(sql.raisePosInPlaylist,
		{
			$pos: pos,
			$playlist_id: id,
			$newpos: pos + 0.1
		});
}

export async function findPlaylist(id,forUser) {
	let query = sql.testPlaylist;
	if (forUser) query += ' AND flag_visible = 1';
	return await getUserDb().get(query,
		{
			$playlist_id: id 
		});
}

export async function findPlaylistFlagPlaying(id) {
	return await getUserDb().get(sql.testPlaylistFlagPlaying,
		{
			$playlist_id: id
		});
}

export async function setCurrentPlaylist(id) {
	return await getUserDb().run(sql.setCurrentPlaylist,
		{
			$playlist_id: id
		});
}

export async function setPublicPlaylist(id) {
	return await getUserDb().run(sql.setPublicPlaylist,
		{
			$playlist_id: id
		});
}

export async function setVisiblePlaylist(id) {
	return await getUserDb().run(sql.setVisiblePlaylist,
		{
			$playlist_id: id
		});
}

export async function unsetVisiblePlaylist(id) {
	return await getUserDb().run(sql.unsetVisiblePlaylist,
		{
			$playlist_id: id
		});
}

export async function unsetCurrentPlaylist() {
	return await getUserDb().run(sql.unsetCurrentPlaylist);
}

export async function unsetPublicPlaylist() {
	return await getUserDb().run(sql.unsetPublicPlaylist);
}

export async function unsetPlaying(playlist_id) {
	return await getUserDb().run(sql.unsetPlaying,
		{
			$playlist_id: playlist_id
		});
}

export async function setPlaying(plc_id) {
	return await getUserDb().run(sql.setPlaying,
		{
			$playlistcontent_id: plc_id
		});
}


import {getUserDb, transaction} from './database';
const sql = require('../_common/db/playlist');

export async function countKarasInPlaylist(id) {
	return await getUserDb().get(sql.countKarasInPlaylist, { $playlist_id: id });
}

export async function editPlaylist(pl) {
	return await getUserDb().run(sql.editPlaylist, {
		$playlist_id: pl.id,
		$name: pl.name,
		$NORM_name: pl.NORM_name,
		$modified_at: pl.modified_at,
		$flag_visible: pl.flag_visible,
	});
}

export async function createPlaylist(pl) {
	return await getUserDb().run(sql.createPlaylist, {
		$playlist_id: pl.id,
		$name: pl.name,
		$NORM_name: pl.NORM_name,
		$created_at: pl.created_at,
		$modified_at: pl.modified_at,
		$flag_visible: pl.flag_visible,
		$flag_current: pl.flag_current,
		$flag_public: pl.flag_public,
		$flag_favorites: pl.flag_favorites,
		$username: pl.username
	});
}

export async function emptyPlaylist(id) {
	return await getUserDb().run(sql.emptyPlaylist, { $playlist_id: id });
}

export async function deletePlaylist(id) {
	return await getUserDb().run(sql.deletePlaylist, { $playlist_id: id });
}

export async function updatePlaylistKaraCount(id,karaCount) {
	return await getUserDb().run(sql.updatePlaylistKaraCount, {
		$playlist_id: id,
		$kara_count: karaCount
	});
}

export async function updatePlaylistLastEditTime(id,timestamp) {
	return await getUserDb().run(sql.updatePlaylistLastEditTime, {
		$playlist_id: id,
		$modified_at: timestamp
	});
}

export async function getPLCByDate(playlist_id,date) {
	return await getUserDb().get(sql.getPLCByDate, {
		$playlist_id: playlist_id,
		$date_added: date
	});
}

export async function shiftPosInPlaylist(id,pos,shift) {
	return await getUserDb().run(sql.shiftPosInPlaylist, {
		$shift: shift,
		$playlist_id: id,
		$pos: pos
	});
}

export async function getMaxPosInPlaylist(id) {
	return await getUserDb().get(sql.getMaxPosInPlaylist, { $playlist_id: id });
}	

export async function reorderPlaylist(playlist_id,playlist) {
	let newpos = 0;
	const karaList = playlist.map((kara) => ({
		$pos: ++newpos,
		$playlistcontent_id: kara.playlistcontent_id
	}));
	return await transaction(karaList,sql.updatePLCSetPos);	
}

export async function setPos(plc_id,pos) {
	return await getUserDb().run(sql.updatePLCSetPos, {
		$pos: pos,
		$playlistcontent_id: plc_id
	});
}

export async function updatePlaylistDuration(id) {
	return await getUserDb().run(sql.updatePlaylistDuration, { $playlist_id: id });
}

export async function trimPlaylist(id,pos) {
	return await getUserDb().run(sql.trimPlaylist, { 
		$playlist_id: id,
		$pos: pos
	});
}

export async function getPlaylistContents(id,forPlayer) {
	const query = forPlayer ? sql.getPlaylistContentsForPlayer : sql.getPlaylistContents;
	return await getUserDb().all(query, { $playlist_id: id });
}

export async function getPlaylistPos(id) {
	return await getUserDb().all(sql.getPlaylistPos, { $playlist_id: id });
}

export async function getPlaylistKaraNames(id) {
	return await getUserDb().all(sql.getPlaylistKaraNames, { $playlist_id: id });
}

export async function getPLCInfo(id,forUser, username) {
	const query = sql.getPLCInfo + (forUser ? ' AND p.flag_visible = 1' : '');
	return await getUserDb().get(query, { 
		$playlistcontent_id: id,
		$username: username
	});
}

export async function getPLCByKID(kid,playlist_id) {
	return await getUserDb().get(sql.getPLCByKID, {
		$kid: kid,
		$playlist_id: playlist_id
	});
}

export async function getPlaylistInfo(id, forUser, username) {
	let query = sql.getPlaylistInfo + (forUser ? ' AND flag_visible = 1 OR (p.flag_visible = 0 AND p.flag_favorites = 1 AND u.login = $username)' : '');
	return await getUserDb().get(query, { 
		$playlist_id: id,
		$username: username 
	});
}

export async function getPlaylists(forUser,username) {
	let query = sql.getPlaylists;	
	const order = ' ORDER BY p.flag_current DESC, p.flag_public DESC, name';	
	if (forUser) {
		//Temporarily disabled complex playlist query until we work how isPlaylist behaves and add user token everywhere.
		//return await getUserDb().all(query + ' UNION ' + sql.getFavoritePlaylists + order,{$username: username});
		return await getUserDb().all(query + ' AND p.flag_visible = 1 ' + order);
	} else {		
		return await getUserDb().all(query + order);
	}
}

export async function findCurrentPlaylist() {
	return await getUserDb().get(sql.testCurrentPlaylist);
}

export async function findPublicPlaylist() {
	return await getUserDb().get(sql.testPublicPlaylist);
}

export async function raisePosInPlaylist(pos,id) {
	return await getUserDb().run(sql.raisePosInPlaylist, {
		$pos: pos,
		$playlist_id: id,
		$newpos: pos + 0.1
	});
}

export async function findPlaylist(id,forUser) {
	const query = sql.testPlaylist + (forUser ? ' AND flag_visible = 1' : '');
	return await getUserDb().get(query, { $playlist_id: id });
}

export async function findPlaylistFlagPlaying(id) {
	return await getUserDb().get(sql.testPlaylistFlagPlaying, { $playlist_id: id });
}

export async function setCurrentPlaylist(id) {
	return await getUserDb().run(sql.setCurrentPlaylist, { $playlist_id: id });
}

export async function setPublicPlaylist(id) {
	return await getUserDb().run(sql.setPublicPlaylist, { $playlist_id: id });
}

export async function setVisiblePlaylist(id) {
	return await getUserDb().run(sql.setVisiblePlaylist, { $playlist_id: id });
}

export async function unsetVisiblePlaylist(id) {
	return await getUserDb().run(sql.unsetVisiblePlaylist, { $playlist_id: id });
}

export async function unsetCurrentPlaylist() {
	return await getUserDb().run(sql.unsetCurrentPlaylist);
}

export async function unsetPublicPlaylist() {
	return await getUserDb().run(sql.unsetPublicPlaylist);
}

export async function unsetPlaying(playlist_id) {
	return await getUserDb().run(sql.unsetPlaying, { $playlist_id: playlist_id });
}

export async function setPlaying(plc_id) {
	return await getUserDb().run(sql.setPlaying, { $playlistcontent_id: plc_id });
}
export async function countPlaylistUsers(playlist_id){
	return await getUserDb().run(sql.countPlaylistUsers, { $playlist_id: playlist_id });
}

export async function getMaxPosInPlaylistForPseudo(playlist_id,user_id){
	return await getUserDb().run(sql.getMaxPosInPlaylistForPseudo,
		{
			$playlist_id: playlist_id,
			$user_id: user_id
		});
}
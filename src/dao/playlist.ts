import {buildClauses, db, transaction} from '../lib/dao/database';
import {getConfig} from '../lib/utils/config';
import {getState} from '../utils/state';
import {now} from '../lib/utils/date';
import {pg as yesql} from 'yesql';
import {Playlist, PLC, PLCParams} from '../types/playlist';
import { QueryResult } from 'pg';
import { DBPLC, DBPLCKID, DBPLPos, DBPLCInfo, DBPL } from '../types/database/playlist';

const sql = require('./sql/playlist');

export async function editPlaylist(pl: Playlist) {
	return await db().query(yesql(sql.editPlaylist)({
		playlist_id: pl.id,
		name: pl.name,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible,
	}));
}

export async function createPlaylist(pl: Playlist): Promise<number> {
	const res = await db().query(yesql(sql.createPlaylist)({
		name: pl.name,
		created_at: pl.created_at,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible || false,
		flag_current: pl.flag_current || false,
		flag_public: pl.flag_public || false,
		username: pl.username
	}));
	return res.rows[0].pk_id_playlist;
}

export async function emptyPlaylist(id: number) {
	return await db().query(sql.emptyPlaylist, [id]);
}

export async function deletePlaylist(id: number) {
	return await db().query(sql.deletePlaylist, [id]);
}

export async function setPLCVisible(plc_id: number) {
	return await db().query(sql.setPLCVisible, [plc_id]);
}

export async function setPLCInvisible(plc_id: number) {
	return await db().query(sql.setPLCInvisible, [plc_id]);
}

export async function setPLCFree(plc_id: number) {
	return await db().query(sql.setPLCFree, [plc_id]);
}

export async function setPLCFreeBeforePos(pos: number, playlist_id: number) {
	return await db().query(yesql(sql.setPLCFreeBeforePos)({
		pos: pos,
		playlist_id: playlist_id
	}));
}

export async function updatePlaylistKaraCount(id: number) {
	return await db().query(sql.updatePlaylistKaraCount, [id]);
}

export async function updatePlaylistLastEditTime(id: number) {
	return await db().query(yesql(sql.updatePlaylistLastEditTime)({
		playlist_id: id,
		modified_at: new Date()
	}));
}

export async function getPLCByDate(playlist_id: number, date: Date): Promise<number> {
	const res = await db().query(yesql(sql.getPLCByDate)({
		playlist_id: playlist_id,
		date_added: date
	}));
	return res.rows[0].playlistcontent_id;
}

export async function shiftPosInPlaylist(id: number, pos: number, shift: number) {
	return await db().query(yesql(sql.shiftPosInPlaylist)({
		shift: shift,
		playlist_id: id,
		pos: pos
	}));
}

export async function getMaxPosInPlaylist(id: number): Promise<number> {
	const res = await db().query(sql.getMaxPosInPlaylist, [id]);
	return res.rows[0].maxpos;
}

export async function replacePlaylist(playlist: PLC[]) {
	let newpos = 0;
	const karaList = playlist.map(kara => ([
		++newpos,
		kara.playlistcontent_id
	]));
	return await transaction([{sql: sql.updatePLCSetPos, params: karaList}]);
}

export async function reorderPlaylist(id: number) {
	return await db().query(sql.reorderPlaylist, [id]);
}

export async function setPos(plc_id: number, pos: number) {
	return await db().query(sql.updatePLCSetPos,[
		pos,
		plc_id
	]);
}

export async function updatePlaylistDuration(id: number) {
	return await db().query(sql.updatePlaylistDuration, [id]);
}

export async function trimPlaylist(id: number, pos: number) {
	return await db().query(yesql(sql.trimPlaylist)({
		playlist_id: id,
		pos: pos
	}));
}

export async function getPlaylistContentsMini(id: number): Promise<DBPLC[]> {
	const res = await db().query(sql.getPlaylistContentsMini, [id]);
	return res.rows;
}

export async function getPlaylistContents(params: PLCParams): Promise<DBPLC[]> {
	const filterClauses = params.filter ? buildClauses(params.filter, true) : {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	let orderClause = 'pc.pos';
	let whereClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	if (+params.random > 0) {
		limitClause = ` LIMIT ${+params.random}`;
		whereClause = ` AND pc.fk_kid NOT IN (
			SELECT pc.fk_kid
			FROM playlist_content pc
			WHERE pc.fk_id_playlist = ${getState().modePlaylistID}
		)`;
		orderClause = 'RANDOM()';
	}
	const query = sql.getPlaylistContents(filterClauses.sql, whereClause, orderClause, limitClause, offsetClause);
	const res = await db().query(yesql(query)({
		playlist_id: params.playlist_id,
		username: params.username,
		dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
		...filterClauses.params
	}));
	return res.rows;
}

export async function getPlaylistKaraIDs(id: number): Promise<DBPLCKID[]> {
	const res = await db().query(sql.getPlaylistContentsKaraIDs, [id]);
	return res.rows;
}


export async function getPlaylistPos(id: number): Promise<DBPLPos[]> {
	const res = await db().query(sql.getPlaylistPos, [id]);
	return res.rows;
}

export async function getPLCInfo(id: number, forUser: boolean, username: string): Promise<DBPLCInfo> {
	const query = sql.getPLCInfo(forUser);
	const res = await db().query(yesql(query)(
		{
			playlistcontent_id: id,
			dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
			username: username
		}));
	return res.rows[0];
}

export async function getPLCInfoMini(id: number): Promise<DBPLC> {
	const res = await db().query(sql.getPLCInfoMini, [id]);
	return res.rows[0];
}

export async function getPLCByKIDAndUser(kid: string, username: string, playlist_id: number): Promise<DBPLC> {
	const res = await db().query(yesql(sql.getPLCByKIDUser)({
		kid: kid,
		playlist_id: playlist_id,
		dejavu_time: new Date((now() - (getConfig().Playlist.MaxDejaVuTime * 60)) * 1000),
		username: username
	}));
	return res.rows[0];
}

export async function getPlaylistInfo(id: number): Promise<DBPL> {
	const res = await db().query(sql.getPlaylistInfo, [id]);
	return res.rows[0];
}

export async function getPlaylists(forUser: boolean): Promise<DBPL[]> {
	let query = sql.getPlaylists;
	const order = ' ORDER BY p.flag_current DESC, p.flag_public DESC, name';
	let res: QueryResult;
	if (forUser) {
		res = await db().query(query + ' WHERE p.flag_visible = TRUE ' + order);
	} else {
		res = await db().query(query + order);
	}
	return res.rows;
}

export async function getCurrentPlaylist(): Promise<DBPL> {
	const res = await db().query(sql.testCurrentPlaylist);
	return res.rows[0];
}

export async function getPublicPlaylist(): Promise<DBPL> {
	const res = await db().query(sql.testPublicPlaylist);
	return res.rows[0];
}

export async function setCurrentPlaylist(id: number) {
	return await db().query(sql.setCurrentPlaylist, [id]);
}

export async function setPublicPlaylist(id: number) {
	return await db().query(sql.setPublicPlaylist, [id]);
}

export async function setVisiblePlaylist(id: number) {
	return await db().query(sql.setVisiblePlaylist, [id]);
}

export async function unsetVisiblePlaylist(id: number) {
	return await db().query(sql.unsetVisiblePlaylist, [id]);
}

export async function unsetCurrentPlaylist() {
	return await db().query(sql.unsetCurrentPlaylist);
}

export async function unsetPublicPlaylist() {
	return await db().query(sql.unsetPublicPlaylist);
}

export async function setPlaying(plc_id: number, playlist_id: number) {
	return await Promise.all([
		db().query(sql.setPlaying, [plc_id]),
		db().query(sql.unsetPlaying, [plc_id, playlist_id])
	]);
}

export async function countPlaylistUsers(playlist_id: number): Promise<number> {
	const res = await db().query(sql.countPlaylistUsers, [playlist_id]);
	return res.rows[0].NumberOfUsers;
}

export async function getMaxPosInPlaylistForUser(playlist_id: number, username: string): Promise<number> {
	const res = await db().query(yesql(sql.getMaxPosInPlaylistForUser)({
		playlist_id: playlist_id,
		username: username
	}));
	return res.rows[0].maxpos;
}

import { QueryResult } from 'pg';
import {pg as yesql} from 'yesql';

import {buildClauses, db, transaction} from '../lib/dao/database';
import {getConfig} from '../lib/utils/config';
import {now} from '../lib/utils/date';
import { DBPL,DBPLC, DBPLCInfo, DBPLCKID, DBPLPos } from '../types/database/playlist';
import {Playlist, PLC, PLCParams} from '../types/playlist';
import {getState} from '../utils/state';
import { sqlcountPlaylistUsers, sqlcreatePlaylist, sqldeletePlaylist, sqleditPlaylist, sqlemptyPlaylist, sqlgetMaxPosInPlaylist, sqlgetMaxPosInPlaylistForUser,sqlgetPlaylistContents, sqlgetPlaylistContentsKaraIDs, sqlgetPlaylistContentsMini, sqlgetPlaylistInfo, sqlgetPlaylistPos, sqlgetPlaylists, sqlgetPLCByDate, sqlgetPLCByKIDUser, sqlgetPLCInfo, sqlgetPLCInfoMini, sqlreorderPlaylist, sqlsetCurrentPlaylist, sqlsetPlaying, sqlsetPLCFree, sqlsetPLCFreeBeforePos, sqlsetPLCInvisible, sqlsetPLCVisible, sqlsetPublicPlaylist, sqlsetVisiblePlaylist, sqlshiftPosInPlaylist, sqltestCurrentPlaylist, sqltestPublicPlaylist, sqltrimPlaylist, sqlunsetCurrentPlaylist, sqlunsetPlaying, sqlunsetPublicPlaylist, sqlunsetVisiblePlaylist, sqlupdatePlaylistDuration, sqlupdatePlaylistKaraCount, sqlupdatePlaylistLastEditTime, sqlupdatePLCSetPos } from './sql/playlist';


export function editPlaylist(pl: Playlist) {
	return db().query(yesql(sqleditPlaylist)({
		playlist_id: pl.id,
		name: pl.name,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible,
	}));
}

export async function createPlaylist(pl: Playlist): Promise<number> {
	const res = await db().query(yesql(sqlcreatePlaylist)({
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

export function emptyPlaylist(id: number) {
	return db().query(sqlemptyPlaylist, [id]);
}

export function deletePlaylist(id: number) {
	return db().query(sqldeletePlaylist, [id]);
}

export function setPLCVisible(plc_id: number) {
	return db().query(sqlsetPLCVisible, [plc_id]);
}

export function setPLCInvisible(plc_id: number) {
	return db().query(sqlsetPLCInvisible, [plc_id]);
}

export function setPLCFree(plc_id: number) {
	return db().query(sqlsetPLCFree, [plc_id]);
}

export function setPLCFreeBeforePos(pos: number, playlist_id: number) {
	return db().query(yesql(sqlsetPLCFreeBeforePos)({
		pos: pos,
		playlist_id: playlist_id
	}));
}

export function updatePlaylistKaraCount(id: number) {
	return db().query(sqlupdatePlaylistKaraCount, [id]);
}

export function updatePlaylistLastEditTime(id: number) {
	return db().query(yesql(sqlupdatePlaylistLastEditTime)({
		playlist_id: id,
		modified_at: new Date()
	}));
}

export async function getPLCByDate(playlist_id: number, date: Date): Promise<number> {
	const res = await db().query(yesql(sqlgetPLCByDate)({
		playlist_id: playlist_id,
		date_added: date
	}));
	return res.rows[0].playlistcontent_id;
}

export function shiftPosInPlaylist(id: number, pos: number, shift: number) {
	return db().query(yesql(sqlshiftPosInPlaylist)({
		shift: shift,
		playlist_id: id,
		pos: pos
	}));
}

export async function getMaxPosInPlaylist(id: number): Promise<number> {
	const res = await db().query(sqlgetMaxPosInPlaylist, [id]);
	return res.rows[0].maxpos;
}

export function replacePlaylist(playlist: PLC[]) {
	let newpos = 0;
	const karaList = playlist.map(kara => ([
		++newpos,
		kara.playlistcontent_id
	]));
	return transaction([{sql: sqlupdatePLCSetPos, params: karaList}]);
}

export function reorderPlaylist(id: number) {
	return db().query(sqlreorderPlaylist, [id]);
}

export  function setPos(plc_id: number, pos: number) {
	return db().query(sqlupdatePLCSetPos,[
		pos,
		plc_id
	]);
}

export  function updatePlaylistDuration(id: number) {
	return db().query(sqlupdatePlaylistDuration, [id]);
}

export  function trimPlaylist(id: number, pos: number) {
	return db().query(yesql(sqltrimPlaylist)({
		playlist_id: id,
		pos: pos
	}));
}

export async function getPlaylistContentsMini(id: number): Promise<DBPLC[]> {
	const res = await db().query(sqlgetPlaylistContentsMini, [id]);
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
	const query = sqlgetPlaylistContents(filterClauses.sql, whereClause, orderClause, limitClause, offsetClause);
	const res = await db().query(yesql(query)({
		playlist_id: params.playlist_id,
		username: params.username,
		dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
		...filterClauses.params
	}));
	return res.rows;
}

export async function getPlaylistKaraIDs(id: number): Promise<DBPLCKID[]> {
	const res = await db().query(sqlgetPlaylistContentsKaraIDs, [id]);
	return res.rows;
}


export async function getPlaylistPos(id: number): Promise<DBPLPos[]> {
	const res = await db().query(sqlgetPlaylistPos, [id]);
	return res.rows;
}

export async function getPLCInfo(id: number, forUser: boolean, username: string): Promise<DBPLCInfo> {
	const query = sqlgetPLCInfo(`${forUser}`);
	const res = await db().query(yesql(query)(
		{
			playlistcontent_id: id,
			dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
			username: username
		}));
	return res.rows[0];
}

export async function getPLCInfoMini(id: number): Promise<DBPLC> {
	const res = await db().query(sqlgetPLCInfoMini, [id]);
	return res.rows[0];
}

export async function getPLCByKIDAndUser(kid: string, username: string, playlist_id: number): Promise<DBPLC> {
	const res = await db().query(yesql(sqlgetPLCByKIDUser)({
		kid: kid,
		playlist_id: playlist_id,
		dejavu_time: new Date((now() - (getConfig().Playlist.MaxDejaVuTime * 60)) * 1000),
		username: username
	}));
	return res.rows[0];
}

export async function getPlaylistInfo(id: number): Promise<DBPL> {
	const res = await db().query(sqlgetPlaylistInfo, [id]);
	return res.rows[0];
}

export async function getPlaylists(forUser: boolean): Promise<DBPL[]> {
	const query = sqlgetPlaylists;
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
	const res = await db().query(sqltestCurrentPlaylist);
	return res.rows[0];
}

export async function getPublicPlaylist(): Promise<DBPL> {
	const res = await db().query(sqltestPublicPlaylist);
	return res.rows[0];
}

export function setCurrentPlaylist(id: number) {
	return db().query(sqlsetCurrentPlaylist, [id]);
}

export function setPublicPlaylist(id: number) {
	return db().query(sqlsetPublicPlaylist, [id]);
}

export function setVisiblePlaylist(id: number) {
	return db().query(sqlsetVisiblePlaylist, [id]);
}

export function unsetVisiblePlaylist(id: number) {
	return db().query(sqlunsetVisiblePlaylist, [id]);
}

export function unsetCurrentPlaylist() {
	return db().query(sqlunsetCurrentPlaylist);
}

export function unsetPublicPlaylist() {
	return db().query(sqlunsetPublicPlaylist);
}

export async function setPlaying(plc_id: number, playlist_id: number) {
	await db().query(sqlsetPlaying, [plc_id]);
	await db().query(sqlunsetPlaying, [plc_id, playlist_id]);
}

export async function countPlaylistUsers(playlist_id: number): Promise<number> {
	const res = await db().query(sqlcountPlaylistUsers, [playlist_id]);
	return res.rows[0].NumberOfUsers;
}

export async function getMaxPosInPlaylistForUser(playlist_id: number, username: string): Promise<number> {
	const res = await db().query(yesql(sqlgetMaxPosInPlaylistForUser)({
		playlist_id: playlist_id,
		username: username
	}));
	return res.rows[0].maxpos;
}

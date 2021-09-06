import { QueryResult } from 'pg';
import { pg as yesql } from 'yesql';

import { buildClauses, db, transaction } from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBPL } from '../lib/types/database/playlist';
import { PLC, PLCParams } from '../lib/types/playlist';
import { getConfig } from '../lib/utils/config';
import { now } from '../lib/utils/date';
import { profile } from '../lib/utils/logger';
import { DBPLC, DBPLCInfo, DBPLCKID } from '../types/database/playlist';
import { getState } from '../utils/state';
import { sqlcountPlaylistUsers, sqlcreatePlaylist, sqldeletePlaylist, sqleditPlaylist, sqlemptyPlaylist, sqlgetMaxPosInPlaylist, sqlgetMaxPosInPlaylistForUser, sqlgetPlaylistContents, sqlgetPlaylistContentsMicro, sqlgetPlaylistContentsMini, sqlgetPlaylistInfo, sqlgetPlaylists, sqlgetPLCByKIDUser, sqlgetPLCInfo, sqlgetPLCInfoMini, sqlreorderPlaylist, sqlsetPlaying, sqlsetPLCAccepted, sqlsetPLCFree, sqlsetPLCFreeBeforePos, sqlsetPLCInvisible, sqlsetPLCRefused, sqlsetPLCVisible, sqlshiftPosInPlaylist, sqltrimPlaylist, sqlupdatePlaylistDuration, sqlupdatePlaylistKaraCount, sqlupdatePlaylistLastEditTime, sqlupdatePLCSetPos } from './sql/playlist';


export function editPlaylist(pl: DBPL) {
	return db().query(yesql(sqleditPlaylist)({
		plaid: pl.plaid,
		name: pl.name,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible,
		flag_current: pl.flag_current,
		flag_public: pl.flag_public,
	}));
}

export async function createPlaylist(pl: DBPL): Promise<string> {
	const res = await db().query(yesql(sqlcreatePlaylist)({
		name: pl.name,
		created_at: pl.created_at,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible || false,
		flag_current: pl.flag_current || null,
		flag_public: pl.flag_public || null,
		username: pl.username.toLowerCase()
	}));
	return res.rows[0]?.pk_id_playlist;
}

export function emptyPlaylist(id: string) {
	return db().query(sqlemptyPlaylist, [id]);
}

export function deletePlaylist(id: string) {
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

export function setPLCAccepted(plc_id: number, flag_accepted: boolean) {
	return db().query(sqlsetPLCAccepted, [plc_id, flag_accepted]);
}

export function setPLCRefused(plc_id: number, flag_refused: boolean) {
	return db().query(sqlsetPLCRefused, [plc_id, flag_refused]);
}

export function setPLCFreeBeforePos(pos: number, plaid: string) {
	return db().query(yesql(sqlsetPLCFreeBeforePos)({
		pos: pos,
		plaid: plaid
	}));
}

export function updatePlaylistKaraCount(id: string) {
	return db().query(sqlupdatePlaylistKaraCount, [id]);
}

export function updatePlaylistLastEditTime(id: string) {
	return db().query(yesql(sqlupdatePlaylistLastEditTime)({
		plaid: id,
		modified_at: new Date()
	}));
}

export function shiftPosInPlaylist(id: string, pos: number, shift: number) {
	return db().query(yesql(sqlshiftPosInPlaylist)({
		shift: shift,
		plaid: id,
		pos: pos
	}));
}

export async function getMaxPosInPlaylist(id: string): Promise<number> {
	const res = await db().query(sqlgetMaxPosInPlaylist, [id]);
	return res.rows[0]?.maxpos;
}

export function replacePlaylist(playlist: PLC[]) {
	let newpos = 0;
	const karaList = playlist.map(kara => ([
		++newpos,
		kara.plcid
	]));
	return transaction({sql: sqlupdatePLCSetPos, params: karaList});
}

export function reorderPlaylist(id: string) {
	return db().query(sqlreorderPlaylist, [id]);
}

export  function setPos(plc_id: number, pos: number) {
	return db().query(sqlupdatePLCSetPos,[
		pos,
		plc_id
	]);
}

export  function updatePlaylistDuration(id: string) {
	return db().query(sqlupdatePlaylistDuration, [id]);
}

export  function trimPlaylist(id: string, pos: number) {
	return db().query(yesql(sqltrimPlaylist)({
		plaid: id,
		pos: pos
	}));
}

export async function getPlaylistContentsMini(id: string): Promise<DBPLC[]> {
	const res = await db().query(sqlgetPlaylistContentsMini, [id]);
	return res.rows;
}

export async function getPlaylistContents(params: PLCParams): Promise<DBPLC[]> {
	const filterClauses: WhereClause = params.filter ? buildClauses(params.filter, true) : {sql: [], params: {}, additionalFrom: []};
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
			WHERE pc.fk_id_playlist = ${getState().publicPlaid}
		)`;
		orderClause = 'RANDOM()';
	}
	if (params.orderByLikes) orderClause = '(CASE WHEN pc.flag_accepted = FALSE AND pc.flag_refused = FALSE THEN TRUE ELSE FALSE END) DESC, pc.flag_accepted DESC, pc.flag_refused DESC, upvotes DESC';
	const query = sqlgetPlaylistContents(filterClauses.sql, whereClause, orderClause, limitClause, offsetClause,
		filterClauses.additionalFrom.join(''));
	const res = await db().query(yesql(query)({
		plaid: params.plaid,
		username: params.username,
		dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
		public_plaid: getState().publicPlaid,
		...filterClauses.params
	}));
	return res.rows;
}

export async function selectPlaylistContentsMicro(id: string): Promise<DBPLCKID[]> {
	try {
		profile('selectPlaylistContentsMicro');
		const res = await db().query(sqlgetPlaylistContentsMicro, [id]);
		return res.rows;
	} catch(err) {
		throw err;
	} finally {
		profile('selectPlaylistContentsMicro');
	}

}

export async function getPLCInfo(id: number, forUser: boolean, username: string): Promise<DBPLCInfo> {
	const query = sqlgetPLCInfo(forUser);
	const res = await db().query(yesql(query)(
		{
			plcid: id,
			dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
			username: username,
			public_plaid: getState().publicPlaid,
			current_plaid: getState().currentPlaid,
		}));
	return res.rows[0] || {};
}

export async function getPLCInfoMini(id: number): Promise<DBPLC> {
	const res = await db().query(sqlgetPLCInfoMini, [id]);
	return res.rows[0];
}

export async function getPLCByKIDAndUser(kid: string, username: string, plaid: string): Promise<DBPLC> {
	const res = await db().query(yesql(sqlgetPLCByKIDUser)({
		kid: kid,
		plaid: plaid,
		dejavu_time: new Date((now() - (getConfig().Playlist.MaxDejaVuTime * 60)) * 1000),
		username: username
	}));
	return res.rows[0];
}

export async function getPlaylistInfo(id: string): Promise<DBPL> {
	const res = await db().query(sqlgetPlaylistInfo, [id]);
	return res.rows[0];
}

export async function getPlaylists(forUser: boolean): Promise<DBPL[]> {
	const query = sqlgetPlaylists;
	const order = ' ORDER BY flag_current DESC, flag_public DESC, name';
	let res: QueryResult;
	if (forUser) {
		res = await db().query(query + ' WHERE flag_visible = TRUE ' + order);
	} else {
		res = await db().query(query + order);
	}
	return res.rows;
}

export async function setPlaying(plc_id: number, plaid: string) {
	await db().query(sqlsetPlaying, [plc_id, plaid]);
}

export async function countPlaylistUsers(plaid: string): Promise<number> {
	const res = await db().query(sqlcountPlaylistUsers, [plaid]);
	return res.rows[0]?.NumberOfUsers;
}

export async function getMaxPosInPlaylistForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(yesql(sqlgetMaxPosInPlaylistForUser)({
		plaid: plaid,
		username: username
	}));
	return res.rows[0]?.maxpos;
}

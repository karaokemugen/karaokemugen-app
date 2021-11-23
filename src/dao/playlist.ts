import { pg as yesql } from 'yesql';

import { buildClauses, db, transaction } from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBPL, DBPLCAfterInsert, SmartPlaylistType } from '../lib/types/database/playlist';
import { Criteria, PLC, PLCParams, UnaggregatedCriteria } from '../lib/types/playlist';
import { getConfig } from '../lib/utils/config';
import { now } from '../lib/utils/date';
import { profile } from '../lib/utils/logger';
import { DBPLC, DBPLCInfo, DBPLCKID } from '../types/database/playlist';
import { getState } from '../utils/state';
import { sqladdCriteria, sqladdKaraToPlaylist, sqlcountPlaylistUsers, sqlcreatePlaylist, sqldeleteCriteria, sqldeleteCriteriaForPlaylist, sqldeletePlaylist, sqleditPlaylist, sqlemptyPlaylist, sqlgetCriterias, sqlgetMaxPosInPlaylist, sqlgetMaxPosInPlaylistForUser, sqlgetPlaylist, sqlgetPlaylistContents, sqlgetPlaylistContentsMicro, sqlgetPlaylistContentsMini, sqlgetPLCByKIDUser, sqlgetPLCInfo, sqlgetPLCInfoMini, sqlgetSongCountPerUser, sqlgetTimeSpentPerUser, sqlremoveKaraFromPlaylist, sqlreorderPlaylist, sqlselectKarasFromCriterias, sqlsetPlaying, sqlsetPLCAccepted, sqlsetPLCFree, sqlsetPLCFreeBeforePos, sqlsetPLCInvisible, sqlsetPLCRefused, sqlsetPLCVisible, sqlshiftPosInPlaylist, sqltrimPlaylist, sqlupdateFreeOrphanedSongs, sqlupdatePlaylistDuration, sqlupdatePlaylistKaraCount, sqlupdatePlaylistLastEditTime, sqlupdatePLCCriterias, sqlupdatePLCSetPos } from './sql/playlist';

export function updatePLCCriterias(plcs: number[], criterias: Criteria[]) {
	return db().query(sqlupdatePLCCriterias, [plcs, criterias]);
}

export function updatePlaylist(pl: DBPL) {
	return db().query(yesql(sqleditPlaylist)(pl));
}

export async function insertPlaylist(pl: DBPL): Promise<string> {
	const res = await db().query(yesql(sqlcreatePlaylist)({
		name: pl.name,
		created_at: pl.created_at,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible || false,
		flag_current: pl.flag_current || false,
		flag_public: pl.flag_public || false,
		flag_smart: pl.flag_smart || false,
		flag_whitelist: pl.flag_whitelist || false,
		flag_blacklist: pl.flag_blacklist || false,
		type_smart: pl.type_smart || 'INTERSECT',
		username: pl.username.toLowerCase()
	}));
	return res.rows[0]?.pk_id_playlist;
}

export function truncatePlaylist(id: string) {
	return db().query(sqlemptyPlaylist, [id]);
}

export function deletePlaylist(id: string) {
	return db().query(sqldeletePlaylist, [id]);
}

export function updatePLCVisible(plc_ids: number[]) {
	return db().query(sqlsetPLCVisible, [plc_ids]);
}

export function updatePLCInvisible(plc_ids: number[]) {
	return db().query(sqlsetPLCInvisible, [plc_ids]);
}

export function updatePLCFree(plc_ids: number[]) {
	return db().query(sqlsetPLCFree, [plc_ids]);
}

export function updatePLCAccepted(plc_ids: number[], flag_accepted: boolean) {
	return db().query(sqlsetPLCAccepted, [plc_ids, flag_accepted]);
}

export function updatePLCRefused(plc_ids: number[], flag_refused: boolean) {
	return db().query(sqlsetPLCRefused, [plc_ids, flag_refused]);
}

export function updatePLCFreeBeforePos(pos: number, plaid: string) {
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

export async function selectMaxPosInPlaylist(id: string): Promise<number> {
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

export  function updatePos(plc_id: number, pos: number) {
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

export async function selectPlaylistContentsMini(id: string): Promise<DBPLC[]> {
	const res = await db().query(sqlgetPlaylistContentsMini, [id]);
	return res.rows;
}

export async function selectPlaylistContents(params: PLCParams): Promise<DBPLC[]> {
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
		whitelist_plaid: getState().whitelistPlaid,
		blacklist_plaid: getState().blacklistPlaid,
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

export async function selectPLCInfo(id: number, forUser: boolean, username: string): Promise<DBPLCInfo> {
	const query = sqlgetPLCInfo(forUser);
	const res = await db().query(yesql(query)(
		{
			plcid: id,
			dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
			username: username,
			public_plaid: getState().publicPlaid,
			current_plaid: getState().currentPlaid,
			whitelist_plaid: getState().whitelistPlaid,
			blacklist_plaid: getState().blacklistPlaid
		}));
	return res.rows[0] || {};
}

export async function selectPLCInfoMini(ids: number[]): Promise<DBPLC[]> {
	const res = await db().query(sqlgetPLCInfoMini, [ids]);
	return res.rows;
}

export async function selectPLCByKIDAndUser(kid: string, username: string, plaid: string): Promise<DBPLC> {
	const res = await db().query(yesql(sqlgetPLCByKIDUser)({
		kid: kid,
		plaid: plaid,
		dejavu_time: new Date((now() - (getConfig().Playlist.MaxDejaVuTime * 60)) * 1000),
		username: username
	}));
	return res.rows[0];
}

export async function selectPlaylists(visibleOnly?: boolean, singlePlaylist?: string): Promise<DBPL[]> {
	const res = await db().query(sqlgetPlaylist(
		singlePlaylist ? true:false,
		visibleOnly), singlePlaylist ? [singlePlaylist] : undefined);
	return res.rows;
}

export async function updatePlaying(plc_id: number, plaid: string) {
	await db().query(sqlsetPlaying, [plc_id, plaid]);
}

export async function countPlaylistUsers(plaid: string): Promise<number> {
	const res = await db().query(sqlcountPlaylistUsers, [plaid]);
	return res.rows[0]?.NumberOfUsers;
}

export async function selectMaxPosInPlaylistForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(yesql(sqlgetMaxPosInPlaylistForUser)({
		plaid: plaid,
		username: username
	}));
	return res.rows[0]?.maxpos;
}

export function insertCriteria(cList: Criteria[]) {
	const c = cList.map((cItem) => ([
		cItem.value,
		cItem.type,
		cItem.plaid
	]));
	return transaction({params: c, sql: sqladdCriteria});
}

export async function selectCriterias(plaid: string): Promise<Criteria[]> {
	const res = await db().query(sqlgetCriterias, [plaid]);
	return res.rows;
}

export function deleteCriteria(c: Criteria) {
	return db().query(sqldeleteCriteria, [c.type, c.value, c.plaid]);
}

export function truncateCriterias(plaid: string) {
	return db().query(sqldeleteCriteriaForPlaylist, [plaid]);
}

export async function selectKarasFromCriterias(plaid: string, smartPlaylistType: SmartPlaylistType): Promise<UnaggregatedCriteria[]> {
	// How that works:
	// When getting a kara list from criterias, we ignore songs from the whitelist when making :
	// - the whitelist itself,  or it would be unable to list songs already in there, causing the songs to be deleted from the whitelist since we're comparing this list to what's already in there
	// - the blacklist so songs whitelisted aren't blacklisted
	// For other smart playlists, daijoubou blacklist.
	const params = [plaid];
	if (plaid === getState().whitelistPlaid || plaid === getState().blacklistPlaid) {
		params.push(getState().whitelistPlaid);
	} else {
		params.push(getState().blacklistPlaid);
	}

	// Now we build query
	const queryArr = [];
	let sql = '';
	const criterias = await selectCriterias(plaid);
	if (criterias.length === 0) return [];
	if (smartPlaylistType === 'UNION') {		
		for (const c of criterias) {
			if (c.type > 0 && c.type < 1000) {
				queryArr.push(sqlselectKarasFromCriterias.tagTypes(`= ${c.type}`, c.value));
			} else if (c.type === 1001) {
				queryArr.push(sqlselectKarasFromCriterias[c.type]);
			} else {
				queryArr.push(sqlselectKarasFromCriterias[c.type](c.value));
			}
		}
		sql = queryArr.join(' UNION ');
	} else {
		// INTERSECT
		// Now the fun begins.
		// We have to wrap all blocks into a SELECT kid to make sure all columns intersect.
		// We also have to put single song additions (type 1001)
		let uniqueKIDsSQL = '';
		let i = 0;
		for (const c of criterias) {
			i++;
			if (c.type > 0 && c.type < 1000) {
				queryArr.push(`SELECT type${c.type}_${i}.kid, type${c.type}_${i}.duration, type${c.type}_${i}.created_at FROM (${sqlselectKarasFromCriterias.tagTypes('= ' + c.type, c.value)}) type${c.type}_${i}`);
			} else if (c.type === 1001) {
				// Only need to add this criteria once.
				if (uniqueKIDsSQL === '') uniqueKIDsSQL = sqlselectKarasFromCriterias[1001];
			} else {
				queryArr.push(`SELECT type${c.type}_${i}.kid, type${c.type}_${i}.duration, type${c.type}_${i}.created_at FROM (${sqlselectKarasFromCriterias[c.type](c.value)}) type${c.type}_${i}`);
			}
		}
		// If queryArr is empty and we're here, it means we don't have any criterias other than the uniqueKIDsSQL one.
		// So we build the query differently
		sql = queryArr.length > 0
			? '(' + queryArr.join(`) ${smartPlaylistType} (`) + ')' +
			(uniqueKIDsSQL === ''
				? ''
				: ' UNION ' + uniqueKIDsSQL
			)
			: uniqueKIDsSQL;
	}	
	const res = await db().query(sql, params);
	// When INTERSECT, we add all criterias to the songs.
	if (smartPlaylistType === 'INTERSECT') {
		for (const song of res.rows) {
			song.criterias = criterias;
		}
	}
	return res.rows;
}

export async function insertKaraIntoPlaylist(karaList: PLC[]): Promise<DBPLCAfterInsert[]> {
	const karas: any[] = karaList.map(kara => ([
		kara.plaid,
		kara.username,
		kara.nickname,
		kara.kid,
		kara.created_at,
		kara.pos,
		kara.flag_free || false,
		kara.flag_visible || true,
		kara.flag_refused || false,
		kara.flag_accepted || false,
		kara.criterias
	]));
	return transaction({params: karas, sql: sqladdKaraToPlaylist});
}

export function deleteKaraFromPlaylist(karas: number[]) {
	return db().query(sqlremoveKaraFromPlaylist.replaceAll('$plcid', karas.join(',')));
}

export function updateFreeOrphanedSongs(expireTime: number) {
	return db().query(sqlupdateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function selectSongTimeSpentForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(sqlgetTimeSpentPerUser, [
		plaid,
		username
	]);
	return res.rows[0]?.time_spent || 0;
}

export async function selectSongCountForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(sqlgetSongCountPerUser, [plaid, username]);
	return res.rows[0]?.count || 0;
}
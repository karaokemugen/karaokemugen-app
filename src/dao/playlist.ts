import i18next from 'i18next';
import { QueryResult } from 'pg';
import { pg as yesql } from 'yesql';

import { buildClauses, db, transaction } from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBPL, DBPLCAfterInsert } from '../lib/types/database/playlist';
import { Criteria, PLC, PLCParams, UnaggregatedCriteria } from '../lib/types/playlist';
import { getConfig } from '../lib/utils/config';
import { now } from '../lib/utils/date';
import { profile } from '../lib/utils/logger';
import { updateAllSmartPlaylists } from '../services/playlist';
import { DBPLC, DBPLCInfo, DBPLCKID } from '../types/database/playlist';
import { getState } from '../utils/state';
import { sqladdCriteria, sqladdKaraToPlaylist, sqlcountPlaylistUsers, sqlcreatePlaylist, sqldeleteCriteria, sqldeleteCriteriaForPlaylist, sqldeletePlaylist, sqleditPlaylist, sqlemptyPlaylist, sqlgetCriterias, sqlgetMaxPosInPlaylist, sqlgetMaxPosInPlaylistForUser, sqlgetPlaylistContents, sqlgetPlaylistContentsMicro, sqlgetPlaylistContentsMini, sqlgetPlaylistInfo, sqlgetPlaylists, sqlgetPLCByKIDUser, sqlgetPLCInfo, sqlgetPLCInfoMini, sqlgetTimeSpentPerUser, sqlremoveKaraFromPlaylist, sqlreorderPlaylist, sqlselectKarasFromCriterias, sqlsetPlaying, sqlsetPLCAccepted, sqlsetPLCFree, sqlsetPLCFreeBeforePos, sqlsetPLCInvisible, sqlsetPLCRefused, sqlsetPLCVisible, sqlshiftPosInPlaylist, sqltrimPlaylist, sqlupdateFreeOrphanedSongs, sqlupdatePlaylistDuration, sqlupdatePlaylistKaraCount, sqlupdatePlaylistLastEditTime, sqlupdatePLCCriterias, sqlupdatePLCSetPos } from './sql/playlist';

export function editPLCCriterias(plc: number, criterias: Criteria[]) {
	return db().query(sqlupdatePLCCriterias, [plc, criterias]);
}

export function editPlaylist(pl: DBPL) {
	return db().query(yesql(sqleditPlaylist)(pl));
}

export async function createPlaylist(pl: DBPL): Promise<string> {
	const res = await db().query(yesql(sqlcreatePlaylist)({
		name: pl.name,
		created_at: pl.created_at,
		modified_at: pl.modified_at,
		flag_visible: pl.flag_visible || false,
		flag_current: pl.flag_current || null,
		flag_public: pl.flag_public || null,
		flag_smart: pl.flag_smart || false,
		flag_whitelist: pl.flag_whitelist || false,
		flag_blacklist: pl.flag_blacklist || false,
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

export async function getPLCInfo(id: number, forUser: boolean, username: string): Promise<DBPLCInfo> {
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

export async function getKarasFromCriterias(plaid: string): Promise<UnaggregatedCriteria[]> {
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
	const res = await db().query(sqlselectKarasFromCriterias, params);
	return res.rows;
}

export async function migrateBLWLToSmartPLs() {
	const [BLCSets, BLCs, WL] = await Promise.all([
		db().query('SELECT * FROM blacklist_criteria_set'),
		db().query('SELECT * FROM blacklist_criteria'),
		db().query('SELECT * FROM whitelist')
	]);
	// Convert whitelist, that's the easiest part.
	if (WL.rows.length > 0) {
		const plaid = await createPlaylist({
			name: i18next.t('WHITELIST'),
			flag_whitelist: true,
			flag_visible: true,
			created_at: new Date(),
			modified_at: new Date(),
			username: 'admin'
		});
		let pos = 0;
		const songs = WL.rows.map(s => {
			pos++;
			return {
				plaid: plaid,
				username: 'admin',
				nickname: 'Dummy Plug System',
				kid: s.kid,
				created_at: new Date(),
				pos: pos,
				criteria: null
			};
		});
		await insertKaraIntoPlaylist(songs);
	}
	// Blacklist(s)
	for (const set of BLCSets.rows) {
		const plaid = await createPlaylist({
			...set,
			flag_current: false,
			flag_visible: true,
			flag_blacklist: set.flag_current,
			flag_smart: true,
			username: 'admin'
		});
		const blc = BLCs.rows.filter(e => e.fk_id_blc_set === set.pk_id_blc_set);
		await insertCriteria(blc.map(e => {
			return {
				plaid: plaid,
				type: e.type,
				value: e.value
			};
		}));
	}
	await updateAllSmartPlaylists();
	/**
	 If it all works out :
	 (uncomment this after the feature is confirmed to work fine)
	 try {
		await db().query('DROP TABLE whitelist');
	 	await db().query('DROP TABLE blacklist_criteria');
	 	await db().query('DROP TABLE blacklist_criteria_set');
	 } catch(err) {
		// Everything is daijokay
	 }
	 */
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
		JSON.stringify(kara.criterias)
	]));
	return transaction({params: karas, sql: sqladdKaraToPlaylist});	
}

export function removeKaraFromPlaylist(karas: number[]) {
	return db().query(sqlremoveKaraFromPlaylist.replace(/\$plcid/,karas.join(',')));
}

export function updateFreeOrphanedSongs(expireTime: number) {
	return db().query(sqlupdateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function getSongTimeSpentForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(sqlgetTimeSpentPerUser, [
		plaid,
		username
	]);
	return res.rows[0]?.time_spent || 0;
}
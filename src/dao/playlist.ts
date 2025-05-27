import { pg as yesql } from 'yesql';

import { buildClauses, db, transaction } from '../lib/dao/database.js';
import { WhereClause } from '../lib/types/database.js';
import { DBPLC, DBPLCBase, PLCInsert } from '../lib/types/database/playlist.js';
import { Criteria, PLCParams, UnaggregatedCriteria } from '../lib/types/playlist.js';
import { getConfig } from '../lib/utils/config.js';
import { getTagTypeName, tagTypes } from '../lib/utils/constants.js';
import { now } from '../lib/utils/date.js';
import { profile } from '../lib/utils/logger.js';
import { DBPL, DBPLCInfo, SmartPlaylistType } from '../types/database/playlist.js';
import { getPlayerState, getState } from '../utils/state.js';
import { organizeTagsInKara } from './kara.js';
import {
	sqladdCriteria,
	sqladdKaraToPlaylist,
	sqlcreatePlaylist,
	sqldeleteCriteria,
	sqldeleteCriteriaForPlaylist,
	sqldeletePlaylist,
	sqleditPlaylist,
	sqlemptyPlaylist,
	sqlgetCriterias,
	sqlgetMaxPosInPlaylist,
	sqlgetPlaylist,
	sqlgetPlaylistContents,
	sqlgetPlaylistContentsMicro,
	sqlgetPlaylistContentsMini,
	sqlgetPLCByKIDUser,
	sqlgetPLCInfo,
	sqlgetPLCInfoMini,
	sqlgetSongCountPerUser,
	sqlgetTimeSpentPerUser,
	sqlremoveKaraFromPlaylist,
	sqlreorderPlaylist,
	sqlselectKarasFromCriterias,
	sqlsetPlayedAt,
	sqlsetPlaying,
	sqlsetPLCAccepted,
	sqlsetPLCFree,
	sqlsetPLCFreeBeforePos,
	sqlsetPLCInvisible,
	sqlsetPLCRefused,
	sqlsetPLCVisible,
	sqlshiftPosInPlaylist,
	sqlupdateFreeOrphanedSongs,
	sqlupdatePlaylistDuration,
	sqlupdatePlaylistKaraCount,
	sqlupdatePlaylistLastEditTime,
	sqlupdatePLCCriterias,
	sqlupdatePLCSetPos,
} from './sql/playlist.js';

//const service = 'PlaylistDB';

const jinglesDuration = 5;
const sponsorsDuration = 5;

export function updatePLCCriterias(plcs: number[], criterias: Criteria[]) {
	return db().query(sqlupdatePLCCriterias, [plcs, criterias]);
}

export function updatePlaylist(pl: DBPL) {
	return db().query(yesql(sqleditPlaylist)(pl));
}

export async function insertPlaylist(pl: DBPL): Promise<string> {
	const res = await db().query(
		yesql(sqlcreatePlaylist)({
			name: pl.name,
			created_at: pl.created_at || new Date(),
			modified_at: pl.modified_at || new Date(),
			flag_visible: pl.flag_visible || false,
			flag_current: pl.flag_current || false,
			flag_public: pl.flag_public || false,
			flag_smart: pl.flag_smart || false,
			flag_whitelist: pl.flag_whitelist || false,
			flag_blacklist: pl.flag_blacklist || false,
			flag_fallback: pl.flag_fallback || false,
			type_smart: pl.type_smart || 'INTERSECT',
			username: pl.username.toLowerCase(),
		})
	);
	return res.rows[0]?.pk_plaid;
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
	return db().query(
		yesql(sqlsetPLCFreeBeforePos)({
			pos,
			plaid,
		})
	);
}

export function updatePlaylistKaraCount(id: string) {
	return db().query(sqlupdatePlaylistKaraCount, [id]);
}

export function updatePlaylistLastEditTime(id: string) {
	return db().query(
		yesql(sqlupdatePlaylistLastEditTime)({
			plaid: id,
			modified_at: new Date(),
		})
	);
}

export function shiftPosInPlaylist(id: string, pos: number, shift: number) {
	return db().query(
		yesql(sqlshiftPosInPlaylist)({
			shift,
			plaid: id,
			pos,
		})
	);
}

export async function selectMaxPosInPlaylist(id: string): Promise<number> {
	const res = await db().query(sqlgetMaxPosInPlaylist, [id]);
	return res.rows[0]?.maxpos;
}

export function replacePlaylist(playlist: DBPLC[]) {
	let newpos = 0;
	const karaList = playlist.map(kara => [(newpos += 1), kara.plcid]);
	return transaction({ sql: sqlupdatePLCSetPos, params: karaList });
}

export function reorderPlaylist(id: string) {
	return db().query(sqlreorderPlaylist, [id]);
}

export function updatePos(plc_id: number, pos: number) {
	return db().query(sqlupdatePLCSetPos, [pos, plc_id]);
}

export function updatePlaylistDuration(id: string) {
	return db().query(
		yesql(sqlupdatePlaylistDuration)({
			plaid: id,
			...getIntermissionSettings(),
		})
	);
}

export async function selectPlaylistContentsMini(id: string): Promise<DBPLC[]> {
	const res = await db().query(
		yesql(sqlgetPlaylistContentsMini)({
			plaid: id,
			dejavu_time: new Date(now() - getConfig().Playlist.MaxDejaVuTime * 60 * 1000),
		})
	);
	const miniTypes = ['singers', 'songtypes', 'langs', 'misc', 'series', 'versions', 'warnings'];
	return res.rows.map(row => {
		const { tags, ...rowWithoutTags } = row;

		for (const tagType of miniTypes) {
			rowWithoutTags[tagType] = [];
		}
		if (tags === null) {
			return rowWithoutTags;
		}
		for (const tag of tags) {
			if (tag?.type_in_kara === null) continue;
			const type = getTagTypeName(tag.type_in_kara);
			if (!type || !miniTypes.includes(type)) continue;
			rowWithoutTags[type].push(tag);
		}
		return rowWithoutTags;
	});
}

function getIntermissionSettings() {
	const state = getPlayerState();
	const conf = getConfig();
	return {
		songsBeforeJingle: state.songsBeforeJingle || 0,
		songsBeforeSponsor: state.songsBeforeSponsor || 0,
		// Did you know? Postgres does not liek dividing by 0.
		// So default value is 1.
		songsBetweenJingles: conf.Playlist.Medias.Jingles.Interval || 1,
		songsBetweenSponsors: conf.Playlist.Medias.Sponsors.Interval || 1,
		jinglesDuration: conf.Playlist.Medias.Jingles.Enabled ? jinglesDuration : 0,
		sponsorsDuration: conf.Playlist.Medias.Sponsors.Enabled ? sponsorsDuration : 0,
		pauseDuration: conf.Karaoke.StreamerMode.Enabled ? conf.Karaoke.StreamerMode.PauseDuration : 0,
	};
}

export async function selectPlaylistContents(params: PLCParams): Promise<DBPLC[]> {
	const filterClauses: WhereClause = params.filter
		? buildClauses(params.filter, true)
		: { sql: [], params: {}, additionalFrom: [] };
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
			WHERE pc.fk_plaid = ${getState().publicPlaid}
		)`;
		orderClause = 'RANDOM()';
	}
	if (params.orderByLikes) {
		orderClause =
			'(CASE WHEN pc.flag_accepted = FALSE AND pc.flag_refused = FALSE THEN TRUE ELSE FALSE END) DESC, pc.flag_accepted DESC, pc.flag_refused DESC, upvotes DESC';
	}
	// Limit params.size when incoming songs because it can beat up postgres.
	if (params.incomingSongs) {
		limitClause = ` LIMIT ${params.size > 400 ? 400 : params.size}`;
	}
	const query = sqlgetPlaylistContents(
		filterClauses.sql,
		whereClause,
		orderClause,
		limitClause,
		offsetClause,
		filterClauses.additionalFrom.join(''),
		params.incomingSongs,
		params.filterByUser
	);
	const res = await db().query(
		yesql(query)({
			plaid: params.plaid,
			username: params.username,
			dejavu_time: new Date(now() - getConfig().Playlist.MaxDejaVuTime * 60 * 1000),
			public_plaid: getState().publicPlaid,
			whitelist_plaid: getState().whitelistPlaid,
			blacklist_plaid: getState().blacklistPlaid,
			...filterClauses.params,
			...getIntermissionSettings(),
		})
	);
	return res.rows.map(row => organizeTagsInKara(row));
}

export async function selectPlaylistContentsMicro(id: string, login?: string): Promise<DBPLCBase[]> {
	try {
		profile('selectPlaylistContentsMicro');
		const params = [id];
		if (login) params.push(login);
		const res = await db().query(sqlgetPlaylistContentsMicro(login), params);
		return res.rows;
	} catch (err) {
		throw err;
	} finally {
		profile('selectPlaylistContentsMicro');
	}
}

export async function selectPLCInfo(id: number, forUser: boolean, username: string): Promise<DBPLCInfo> {
	const query = sqlgetPLCInfo(forUser);
	const res = await db().query(
		yesql(query)({
			plcid: id,
			dejavu_time: new Date(now() - getConfig().Playlist.MaxDejaVuTime * 60 * 1000),
			username,
			public_plaid: getState().publicPlaid,
			current_plaid: getState().currentPlaid,
			whitelist_plaid: getState().whitelistPlaid,
			blacklist_plaid: getState().blacklistPlaid,
		})
	);
	if (!res.rows[0]) {
		return <any>{};
	}

	return organizeTagsInKara(res.rows[0]);
}

export async function selectPLCInfoMini(ids: number[]): Promise<DBPLC[]> {
	const res = await db().query(sqlgetPLCInfoMini, [ids]);
	return res.rows;
}

export async function selectPLCByKIDAndUser(kid: string, username: string, plaid: string): Promise<DBPLC> {
	const res = await db().query(
		yesql(sqlgetPLCByKIDUser)({
			kid,
			plaid,
			dejavu_time: new Date((now() - getConfig().Playlist.MaxDejaVuTime * 60) * 1000),
			username,
		})
	);
	return res.rows[0];
}

export async function selectPlaylists(visibleOnly?: boolean, singlePlaylist?: string): Promise<DBPL[]> {
	const res = await db().query(
		sqlgetPlaylist(!!singlePlaylist, visibleOnly),
		singlePlaylist ? [singlePlaylist] : undefined
	);
	return res.rows;
}

export async function updatePlaying(plc_id: number, plaid: string) {
	await db().query(sqlsetPlaying, [plc_id, plaid]);
}

export async function updatePlayedAt(plc_id: number) {
	await db().query(sqlsetPlayedAt, [plc_id]);
}

export function insertCriteria(cList: Criteria[]) {
	const c = cList.map(cItem => [cItem.value, cItem.type, cItem.plaid]);
	return transaction({ params: c, sql: sqladdCriteria });
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

/** I'm adding this to the list of cursed KM functions. */
export async function selectKarasFromCriterias(
	plaid: string,
	smartPlaylistType: SmartPlaylistType
): Promise<UnaggregatedCriteria[]> {
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
	// Uncomment this for
	// logger.debug(`Criterias selected for playlist ${plaid}: ${JSON.stringify(criterias)}`, { service, obj: criterias });
	const collections = getConfig().Karaoke.Collections;
	const collectionClauses = [];
	if (collections)
		for (const collection of Object.keys(collections)) {
			if (collection) collectionClauses.push(`'${collection}~${tagTypes.collections}' = ANY(ak.tid)`);
		}
	if (smartPlaylistType === 'UNION') {
		for (const c of criterias) {
			// Ignore if criteria is not found
			if (c.type > 999 && !sqlselectKarasFromCriterias[c.type]) continue;
			if (c.type > 0 && c.type < 1000) {
				queryArr.push(sqlselectKarasFromCriterias.tagTypes(`= ${c.type}`, c.value, collectionClauses));
			} else if (c.type === 1001) {
				queryArr.push(sqlselectKarasFromCriterias[c.type](collectionClauses));
			} else {
				queryArr.push(sqlselectKarasFromCriterias[c.type](c.value, collectionClauses));
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
			// Ignore if criteria is not found
			if (c.type > 999 && !sqlselectKarasFromCriterias[c.type]) continue;
			i += 1;
			if (c.type > 0 && c.type < 1000) {
				queryArr.push(
					`SELECT type${c.type}_${i}.kid, type${c.type}_${i}.duration, type${
						c.type
					}_${i}.created_at FROM (${sqlselectKarasFromCriterias.tagTypes(`= ${c.type}`, c.value, collectionClauses)}) type${
						c.type
					}_${i}`
				);
			} else if (c.type === 1001) {
				// Only need to add this criteria once.
				if (uniqueKIDsSQL === '') uniqueKIDsSQL = sqlselectKarasFromCriterias[1001](collectionClauses);
			} else {
				queryArr.push(
					`SELECT type${c.type}_${i}.kid, type${c.type}_${i}.duration, type${
						c.type
					}_${i}.created_at FROM (${sqlselectKarasFromCriterias[c.type](c.value, collectionClauses)}) type${c.type}_${i}`
				);
			}
		}
		// If queryArr is empty and we're here, it means we don't have any criterias other than the uniqueKIDsSQL one.
		// So we build the query differently
		sql =
			queryArr.length > 0
				? `(${queryArr.join(`) ${smartPlaylistType} (`)})${
						uniqueKIDsSQL === ''
							? ''
							: ` UNION (SELECT type_1001_1.kid, type_1001_1.duration, type_1001_1.created_at FROM (${uniqueKIDsSQL}) type_1001_1)`
					}`
				: uniqueKIDsSQL;
	}
	// Uncomment this if smart playlist needs debugging
	// logger.debug(`SQL for Smart playlist: "${sql}" with params ${params}`, { service });
	const res = await db().query(sql, params);
	// When INTERSECT, we add all criterias to the songs.
	if (smartPlaylistType === 'INTERSECT') {
		for (const song of res.rows) {
			song.criterias = criterias;
		}
	}
	return res.rows;
}

export async function insertKaraIntoPlaylist(karaList: PLCInsert[]): Promise<DBPLCBase[]> {
	const karas: any[] = karaList.map(kara => [
		kara.plaid,
		kara.username,
		kara.nickname,
		kara.kid,
		kara.added_at || new Date(),
		kara.pos,
		kara.flag_free || false,
		kara.flag_visible || true,
		kara.flag_refused || false,
		kara.flag_accepted || false,
		kara.criterias,
	]);
	return transaction({ params: karas, sql: sqladdKaraToPlaylist });
}

export function deleteKaraFromPlaylist(karas: number[]) {
	return db().query(sqlremoveKaraFromPlaylist.replaceAll('$plcid', karas.join(',')));
}

export function updateFreeOrphanedSongs(expireTime: number) {
	return db().query(sqlupdateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function selectSongTimeSpentForUser(plaids: string[], username: string): Promise<number> {
	const res = await db().query(sqlgetTimeSpentPerUser, [plaids, username]);
	return res.rows[0]?.time_spent || 0;
}

export async function selectSongCountForUser(plaids: string[], username: string): Promise<number> {
	const res = await db().query(sqlgetSongCountPerUser, [plaids, username]);
	return res.rows[0]?.count || 0;
}

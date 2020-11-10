import {pg as yesql} from 'yesql';

import {buildClauses, buildTypeClauses, db, transaction} from '../lib/dao/database';
import { DBKara, DBKaraBase,DBYear } from '../lib/types/database/kara';
import { Kara, KaraParams } from '../lib/types/kara';
import {getConfig} from '../lib/utils/config';
import {now} from '../lib/utils/date';
import { DBKaraHistory } from '../types/database/kara';
import { DBPLCAfterInsert } from '../types/database/playlist';
import {PLC} from '../types/playlist';
import { getState } from '../utils/state';
import { sqladdKaraToPlaylist, sqladdRequested, sqladdViewcount, sqldeleteKara, sqlgetAllKaras, sqlgetKaraHistory, sqlgetKaraMini, sqlgetSongCountPerUser, sqlgetTimeSpentPerUser, sqlgetYears, sqlinsertKara, sqlremoveKaraFromPlaylist,sqlselectAllKIDs, sqlupdateFreeOrphanedSongs, sqlupdateKara } from './sql/kara';


export async function getSongCountForUser(playlist_id: number, username: string): Promise<number> {
	const res = await db().query(sqlgetSongCountPerUser, [playlist_id, username]);
	return res.rows[0].count;
}


export async function getYears(): Promise<DBYear[]> {
	const res = await db().query(sqlgetYears);
	return res.rows;
}

export async function updateKara(kara: Kara) {
	await db().query(yesql(sqlupdateKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		mediasize: kara.mediasize,
		subchecksum: kara.subchecksum,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.songorder || null,
		duration: kara.mediaduration || kara.duration,
		gain: kara.mediagain || kara.gain,
		modified_at: kara.modified_at,
		kid: kara.kid
	}));
}

export async function addKara(kara: Kara) {
	await db().query(yesql(sqlinsertKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		subchecksum: kara.subchecksum,
		title: kara.title,
		year: kara.year,
		songorder: kara.songorder || null,
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: kara.modified_at,
		created_at: kara.created_at,
		kid: kara.kid,
		repository: kara.repository,
		mediasize: kara.mediasize
	}));
}

export async function getSongTimeSpentForUser(playlist_id: number, username: string): Promise<number> {
	const res = await db().query(sqlgetTimeSpentPerUser,[
		playlist_id,
		username
	]);
	return res.rows[0].time_spent;
}

export async function deleteKara(kid: string) {
	await db().query(sqldeleteKara, [kid]);
}

export async function selectAllKaras(params: KaraParams): Promise<DBKara[]> {
	const filterClauses = params.filter ? buildClauses(params.filter) : {sql: [], params: {}};
	let typeClauses = params.mode && params.modeValue ? buildTypeClauses(params.mode, params.modeValue) : '';
	// Hide blacklisted songs if not admin
	if (!params.ignoreBlacklist && (!params.admin || params.blacklist)) typeClauses = `${typeClauses} AND ak.kid NOT IN (SELECT fk_kid FROM blacklist)`;
	let orderClauses = '';
	let limitClause = '';
	let offsetClause = '';
	let havingClause = '';
	let groupClause = '';
	// Search mode to filter karas played or requested in a particular session
	if (params.mode === 'sessionPlayed') {
		orderClauses = groupClause = 'p.played_at, ';
		typeClauses = `AND p.fk_seid = '${params.modeValue}'`;
	}
	if (params.mode === 'sessionRequested') {
		orderClauses = groupClause = 'rq.requested_at, ';
		typeClauses = `AND rq.fk_seid = '${params.modeValue}'`;
	}
	if (params.mode === 'recent') orderClauses = 'created_at DESC, ';
	if (params.mode === 'requested') {
		orderClauses = 'requested DESC, ';
		havingClause = 'HAVING COUNT(rq.*) > 1';
	}
	if (params.mode === 'played') {
		orderClauses = 'played DESC, ';
		havingClause = 'HAVING COUNT(p.*) > 1';
	}
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	// If we're asking for random songs, here we modify the query to get them.
	if (params.random > 0) {
		orderClauses = `RANDOM(), ${orderClauses}`;
		limitClause = `LIMIT ${params.random}`;
		typeClauses = `${typeClauses} AND ak.kid NOT IN (
			SELECT pc.fk_kid
			FROM playlist_content pc
			WHERE pc.fk_id_playlist = ${getState().publicPlaylistID}
		)`;
	}
	const query = sqlgetAllKaras(filterClauses.sql, typeClauses, groupClause, orderClauses, havingClause, limitClause, offsetClause);
	const queryParams = {
		publicPlaylist_id: getState().publicPlaylistID,
		dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
		username: params.username,
		...filterClauses.params
	};
	const res = await db().query(yesql(query)(queryParams));
	return res.rows;
}

export async function getKaraHistory(): Promise<DBKaraHistory[]> {
	const res = await db().query(sqlgetKaraHistory);
	return res.rows;
}

export function updateFreeOrphanedSongs(expireTime: number) {
	return db().query(sqlupdateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function getKaraMini(kid: string): Promise<DBKaraBase> {
	const res = await db().query(sqlgetKaraMini, [kid]);
	return res.rows[0];
}

export function addPlayed(kid: string) {
	return db().query(yesql(sqladdViewcount)({
		kid: kid,
		played_at: new Date(),
		seid: getState().currentSessionID
	}));
}

export function addKaraToRequests(username: string, karaList: string[]) {
	const karas = karaList.map(kara => ([
		username,
		kara,
		new Date(),
		getState().currentSessionID
	]));
	return transaction({params: karas, sql: sqladdRequested});
}

export async function selectAllKIDs(): Promise<string[]> {
	const res = await db().query(sqlselectAllKIDs);
	return res.rows.map((k: Kara) => k.kid);
}

export async function addKaraToPlaylist(karaList: PLC[]): Promise<DBPLCAfterInsert[]> {
	if (karaList.length > 1) {
		const karas: any[] = karaList.map(kara => ([
			kara.playlist_id,
			kara.username,
			kara.nickname,
			kara.kid,
			kara.created_at,
			kara.pos,
			false,
			kara.flag_visible || true
		]));
		const res = await transaction({params: karas, sql: sqladdKaraToPlaylist});
		return res;
	} else {
		const kara = karaList[0];
		const res = await db().query(sqladdKaraToPlaylist, [
			kara.playlist_id,
			kara.username,
			kara.nickname,
			kara.kid,
			kara.created_at,
			kara.pos,
			false,
			kara.flag_visible
		]);
		return res.rows;
	}
}

export function removeKaraFromPlaylist(karas: number[], playlist_id: number) {
	return db().query(sqlremoveKaraFromPlaylist.replace(/\$playlistcontent_id/,karas.join(',')), [playlist_id]);
}

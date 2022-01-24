import { pg as yesql } from 'yesql';

import { buildClauses, buildTypeClauses, copyFromData, db, transaction } from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBKara, DBKaraBase, DBYear } from '../lib/types/database/kara';
import { Kara, KaraParams } from '../lib/types/kara';
import { getConfig } from '../lib/utils/config';
import { now } from '../lib/utils/date';
import { getState } from '../utils/state';
import {
	sqladdRequested,
	sqladdViewcount,
	sqldeleteChildrenKara,
	sqldeleteKara,
	sqlgetAllKaras,
	sqlgetKaraMini,
	sqlgetYears,
	sqlinsertChildrenParentKara,
	sqlinsertKara,
	sqlselectAllKIDs,
	sqlTruncateOnlineRequested,
	sqlupdateKara,
} from './sql/kara';

export async function selectYears(): Promise<DBYear[]> {
	const res = await db().query(sqlgetYears);
	return res.rows;
}

export async function updateKara(kara: Kara) {
	await db().query(
		yesql(sqlupdateKara)({
			karafile: kara.karafile,
			mediafile: kara.mediafile,
			mediasize: kara.mediasize,
			subfile: kara.subfile,
			titles: kara.titles,
			titles_aliases: JSON.stringify(kara.titles_aliases || []),
			year: kara.year,
			songorder: kara.songorder || null,
			duration: kara.duration,
			gain: kara.gain,
			loudnorm: kara.loudnorm,
			modified_at: kara.modified_at,
			kid: kara.kid,
			comment: kara.comment,
			ignoreHooks: kara.ignoreHooks || false,
		})
	);
}

export async function insertKara(kara: Kara) {
	await db().query(
		yesql(sqlinsertKara)({
			karafile: kara.karafile,
			mediafile: kara.mediafile,
			subfile: kara.subfile,
			titles: kara.titles,
			titles_aliases: JSON.stringify(kara.titles_aliases || []),
			year: kara.year,
			songorder: kara.songorder || null,
			duration: kara.duration,
			gain: kara.gain,
			loudnorm: kara.loudnorm,
			modified_at: kara.modified_at,
			created_at: kara.created_at,
			kid: kara.kid,
			repository: kara.repository,
			mediasize: kara.mediasize,
			download_status: 'DOWNLOADED',
			comment: kara.comment,
			ignoreHooks: kara.ignoreHooks || false,
		})
	);
}

export async function deleteKara(kids: string[]) {
	await db().query(sqldeleteKara, [kids]);
}

export async function selectAllKaras(params: KaraParams): Promise<DBKara[]> {
	const filterClauses: WhereClause = params.filter
		? buildClauses(params.filter, false, params.parentsOnly)
		: { sql: [], params: {}, additionalFrom: [] };
	let whereClauses = params.q ? buildTypeClauses(params.q, params.order) : '';
	// Hide blacklisted songs
	if (params.blacklist) {
		whereClauses = `${whereClauses} AND ak.pk_kid NOT IN (SELECT fk_kid FROM playlist_content WHERE fk_id_playlist = '${
			getState().blacklistPlaid
		}')`;
	}
	let orderClauses = '';
	let limitClause = '';
	let offsetClause = '';
	let havingClause = '';
	let groupClause = '';
	let selectRequested = `COUNT(rq.*)::integer AS requested,
	MAX(rq.requested_at) AS lastrequested_at,
	`;
	const joinClauses = [' LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.pk_kid '];
	// This is normal behaviour without anyone.
	let groupClauseEnd = '';
	// Search mode to filter karas played or requested in a particular session
	if (params.order === 'history') {
		orderClauses = 'lastplayed_at DESC NULLS LAST, ';
	}
	if (params.order === 'sessionPlayed') {
		orderClauses = groupClause = 'p.played_at, ';
	}
	if (params.order === 'sessionRequested') {
		orderClauses = groupClause = 'rq.requested_at, ';
	}
	if (params.order === 'recent') orderClauses = 'created_at DESC, ';
	if (params.order === 'requested' && getConfig().Online.FetchPopularSongs) {
		orderClauses = 'requested DESC, ';
		groupClauseEnd = ', requested';
		selectRequested = 'orq.requested AS requested, ';
		// Emptying joinClauses first before adding something to it.
		joinClauses.splice(0, joinClauses.length);
		joinClauses.push(' LEFT OUTER JOIN online_requested AS orq ON orq.fk_kid = ak.pk_kid ');
		whereClauses = ' AND requested > 1';
	}
	if (params.order === 'requestedLocal' || (params.order === 'requested' && !getConfig().Online.FetchPopularSongs)) {
		orderClauses = 'requested DESC, ';
		havingClause = 'HAVING COUNT(rq.*) > 1';
	}
	if (params.order === 'played') {
		orderClauses = 'played DESC, ';
		havingClause = 'HAVING COUNT(p.*) > 1';
	}
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	// If we're asking for random songs, here we modify the query to get them.
	if (params.random > 0) {
		orderClauses = `RANDOM(), ${orderClauses}`;
		limitClause = `LIMIT ${params.random}`;
		whereClauses = `${whereClauses} AND ak.pk_kid NOT IN (
			SELECT pc.fk_kid
			FROM playlist_content pc
			WHERE pc.fk_id_playlist = '${getState().publicPlaid}'
		)`;
	}
	if (params.parentsOnly) {
		// List all songs which are parents or not children.
		whereClauses = `${whereClauses} AND (ak.pk_kid IN (
			SELECT fk_kid_parent FROM kara_relation
		) OR ak.pk_kid NOT IN (
			SELECT fk_kid_child FROM kara_relation
		))`;
	}
	if (params.userFavorites) {
		whereClauses += ` AND uf.fk_login = '${params.userFavorites}' `;
		joinClauses.push(
			` LEFT OUTER JOIN favorites AS uf ON uf.fk_login = '${params.userFavorites}' AND uf.fk_kid = ak.pk_kid `
		);
	}
	const query = sqlgetAllKaras(
		filterClauses.sql,
		whereClauses,
		groupClause,
		orderClauses,
		havingClause,
		limitClause,
		offsetClause,
		filterClauses.additionalFrom,
		selectRequested,
		groupClauseEnd,
		joinClauses
	);
	const queryParams = {
		publicPlaylist_id: getState().publicPlaid,
		dejavu_time: new Date(now() - getConfig().Playlist.MaxDejaVuTime * 60 * 1000),
		username: params.username || 'admin',
		...filterClauses.params,
	};
	const res = await db().query(yesql(query)(queryParams));
	return res.rows;
}

export async function selectKaraMini(kid: string): Promise<DBKaraBase> {
	const res = await db().query(sqlgetKaraMini, [kid]);
	return res.rows[0] || {};
}

export function insertPlayed(kid: string) {
	return db().query(
		yesql(sqladdViewcount)({
			kid,
			played_at: new Date(),
			seid: getState().currentSessionID,
		})
	);
}

export function insertKaraToRequests(username: string, karaList: string[]) {
	const karas = karaList.map(kara => [username, kara, new Date(), getState().currentSessionID]);
	return transaction({ params: karas, sql: sqladdRequested });
}

export async function selectAllKIDs(): Promise<string[]> {
	const res = await db().query(sqlselectAllKIDs);
	return res.rows.map((k: Kara) => k.kid);
}

export function truncateOnlineRequested() {
	return db().query(sqlTruncateOnlineRequested);
}

export function insertOnlineRequested(requested: string[][]) {
	return copyFromData('online_requested', requested);
}

export async function updateKaraParents(kara: Kara) {
	// First removing all parents for that (child) karaoke
	await db().query(sqldeleteChildrenKara, [kara.kid]);
	if (!kara.parents) return;
	for (const pkid of kara.parents) {
		const pkara = await selectKaraMini(pkid);
		if (kara.repository !== pkara.repository) {
			throw new Error(`${pkid} is not in ${kara.repository} repository`);
		}
		await db().query(
			yesql(sqlinsertChildrenParentKara)({
				parent_kid: pkid,
				child_kid: kara.kid,
			})
		);
	}
}

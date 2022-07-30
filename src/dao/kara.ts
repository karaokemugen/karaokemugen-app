import { pg as yesql } from 'yesql';

import { buildClauses, buildTypeClauses, copyFromData, db, transaction } from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBKara, DBKaraBase, DBYear, KaraOldData } from '../lib/types/database/kara';
import { Kara, KaraFileV4, KaraParams } from '../lib/types/kara';
import { getConfig } from '../lib/utils/config';
import { getTagTypeName, tagTypes } from '../lib/utils/constants';
import { now } from '../lib/utils/date';
import { getState } from '../utils/state';
import {
	sqladdRequested,
	sqladdViewcount,
	sqldeleteChildrenKara,
	sqldeleteKara,
	sqlgetAllKaras,
	sqlgetAllKarasMicro,
	sqlgetYears,
	sqlinsertChildrenParentKara,
	sqlinsertKara,
	sqlselectAllKIDs,
	sqlTruncateOnlineRequested,
} from './sql/kara';

export async function selectYears(): Promise<DBYear[]> {
	const collectionsClauses = [];
	const collections = getConfig().Karaoke.Collections;
	for (const collection of Object.keys(collections)) {
		if (collections[collection] === true)
			collectionsClauses.push(`'${collection}~${tagTypes.collections}' = ANY(ak.tid)`);
	}
	const res = await db().query(sqlgetYears(collectionsClauses));
	return res.rows;
}

export async function insertKara(kara: KaraFileV4): Promise<KaraOldData> {
	const data = await db().query(
		yesql(sqlinsertKara)({
			karafile: kara.meta.karaFile,
			mediafile: kara.medias[0].filename,
			subfile: kara.medias[0].lyrics[0]?.filename || null,
			titles: kara.data.titles,
			titles_aliases: JSON.stringify(kara.data.titles_aliases || []),
			titles_default_language: kara.data.titles_default_language || 'eng',
			year: kara.data.year,
			songorder: kara.data.songorder || null,
			duration: kara.medias[0].duration,
			gain: kara.medias[0].audiogain,
			loudnorm: kara.medias[0].loudnorm,
			modified_at: new Date(kara.data.modified_at),
			created_at: new Date(kara.data.created_at),
			kid: kara.data.kid,
			repository: kara.data.repository,
			mediasize: kara.medias[0].filesize,
			download_status: 'DOWNLOADED', // Default
			comment: kara.data.comment,
			ignoreHooks: kara.data.ignoreHooks || false,
		})
	);
	return data.rows[0];
}

export async function deleteKara(kids: string[]) {
	await db().query(sqldeleteKara, [kids]);
}

export async function selectAllKaras(params: KaraParams): Promise<DBKara[]> {
	const filterClauses: WhereClause = params.filter
		? buildClauses(params.filter, false, params.parentsOnly)
		: { sql: [], params: {}, additionalFrom: [] };
	const typeClauses = params.q
		? buildTypeClauses(params.q, params.order)
		: { sql: [], params: {}, additionalFrom: [] };
	const yesqlPayload = {
		sql: [...filterClauses.sql, ...typeClauses.sql],
		params: { ...filterClauses.params, ...typeClauses.params },
		additionalFrom: [...filterClauses.additionalFrom, ...typeClauses.additionalFrom],
	};
	let whereClauses = '';
	const withCTEs = ['blank AS (SELECT true)'];
	// Hide blacklisted songs
	let blacklistClauses = '';
	if (params.blacklist) {
		withCTEs.push(
			`blacklist AS (SELECT fk_kid AS kid FROM playlist_content WHERE fk_id_playlist = '${
				getState().blacklistPlaid
			}')`
		);
		blacklistClauses += ' AND ak.pk_kid NOT IN (SELECT kid FROM blacklist)';
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
		whereClauses += ` AND ak.pk_kid NOT IN (
			SELECT pc.fk_kid
			FROM playlist_content pc
			WHERE pc.fk_id_playlist = '${getState().publicPlaid}'
		)`;
	}
	const collections = getConfig().Karaoke.Collections;
	if (params.parentsOnly) {
		const collectionsParentClauses = [];
		let collectionsParentJoin = '';
		if (!params.ignoreCollections) {
			collectionsParentJoin = `LEFT JOIN all_karas ak2 ON ak2.pk_kid = kr.fk_kid_parent
			WHERE
			${params.blacklist ? 'fk_kid_parent NOT IN (SELECT * FROM blacklist) AND ' : ''}
			`;
			for (const collection of Object.keys(collections)) {
				if (collections[collection] === true)
					collectionsParentClauses.push(`'${collection}~${tagTypes.collections}' = ANY(ak2.tid)`);
			}
		}
		// List all songs which are parents or not children.
		withCTEs.push('parents AS (SELECT fk_kid_parent AS kid FROM kara_relation)');
		withCTEs.push(`children AS (SELECT kr.fk_kid_child AS kid FROM kara_relation kr
			${collectionsParentJoin}
			${collectionsParentClauses.join(' OR ')}
		)`);
		whereClauses += ` AND (ak.pk_kid IN (
			SELECT kid FROM parents
		) OR ak.pk_kid NOT IN (
			SELECT kid FROM children
		))`;
	}
	if (params.userFavorites) {
		whereClauses += ' AND uf.fk_login = :username_favs';
		joinClauses.push(' LEFT OUTER JOIN favorites AS uf ON uf.fk_login = :username_favs AND uf.fk_kid = ak.pk_kid ');
		yesqlPayload.params.username_favs = params.userFavorites;
	}
	const collectionClauses = [];
	if (!params.ignoreCollections) {
		for (const collection of Object.keys(collections)) {
			if (collections[collection] === true)
				collectionClauses.push(`'${collection}~${tagTypes.collections}' = ANY(ak.tid)`);
		}
	}
	const query = sqlgetAllKaras(
		yesqlPayload.sql,
		whereClauses,
		groupClause,
		orderClauses,
		havingClause,
		limitClause,
		offsetClause,
		yesqlPayload.additionalFrom,
		selectRequested,
		groupClauseEnd,
		joinClauses,
		collectionClauses,
		withCTEs,
		blacklistClauses
	);
	const queryParams = {
		publicPlaylist_id: getState().publicPlaid,
		dejavu_time: new Date(now() - getConfig().Playlist.MaxDejaVuTime * 60 * 1000),
		username: params.username || 'admin',
		...yesqlPayload.params,
	};
	const res = await db().query(yesql(query)(queryParams));
	return res.rows.map(row => organizeTagsInKara(row));
}

export function organizeTagsInKara<T extends DBKara>(row: T & { tags: any }): T {
	const { tags, ...rowWithoutTags } = row;

	for (const tagType of Object.keys(tagTypes)) {
		rowWithoutTags[tagType] = [];
	}
	if (tags == null) {
		return <any>rowWithoutTags;
	}
	for (const tag of tags) {
		if (tag?.type_in_kara == null) continue;
		const type = getTagTypeName(tag.type_in_kara);
		if (type == null) continue;
		rowWithoutTags[type].push(tag);
	}
	return <any>rowWithoutTags;
}

export async function selectAllKarasMicro(params: KaraParams): Promise<DBKaraBase[]> {
	const typeClauses = params.q
		? buildTypeClauses(params.q, params.order)
		: { sql: [], params: {}, additionalFrom: [] };
	const yesqlPayload = {
		sql: [...typeClauses.sql],
		params: { ...typeClauses.params },
		additionalFrom: [...typeClauses.additionalFrom],
	};
	const collectionClauses = [];
	if (!params.ignoreCollections) {
		const collections = getConfig().Karaoke.Collections;
		for (const collection of Object.keys(collections)) {
			if (collection) collectionClauses.push(`'${collection}~${tagTypes.collections}' = ANY(ak.tid)`);
		}
	}
	const query = sqlgetAllKarasMicro(yesqlPayload.sql, yesqlPayload.additionalFrom, collectionClauses);
	const queryParams = {
		...yesqlPayload.params,
	};
	const res = await db().query(yesql(query)(queryParams));
	return res.rows;
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

export async function selectAllKIDs(kid?: string): Promise<string[]> {
	const res = await db().query(sqlselectAllKIDs(kid));
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
		const pkara = await selectAllKIDs(pkid);
		if (!pkara[0]) throw new Error(`Parent kara ${pkid} not in database!`);
		await db().query(
			yesql(sqlinsertChildrenParentKara)({
				parent_kid: pkid,
				child_kid: kara.kid,
			})
		);
	}
}

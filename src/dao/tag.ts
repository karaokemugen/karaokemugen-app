import { pg as yesql } from 'yesql';

import {db, paramWords} from '../lib/dao/database';
import { DBTag, DBTagMini } from '../lib/types/database/tag';
import { Tag, TagAndType,TagParams } from '../lib/types/tag';
import { WhereClause } from '../lib/types/database';
import { sqldeleteTag,sqldeleteTagsByKara, sqlgetAllTags, sqlgetTag, sqlgetTagByNameAndType, sqlgetTagMini, sqlinsertKaraTags, sqlinsertTag, sqlselectDuplicateTags, sqlupdateKaraTagsTID, sqlupdateTag } from './sql/tag';

export async function selectTag(id: string): Promise<Tag> {
	const res = await db().query(sqlgetTag, [id]);
	return res.rows[0];
}

export async function selectTagMini(id: string): Promise<DBTagMini> {
	const res = await db().query(sqlgetTagMini, [id]);
	return res.rows[0];
}

export async function getAllTags(params: TagParams): Promise<DBTag[]> {
	const filterClauses: WhereClause = params.filter
		? buildTagClauses(params.filter)
		: {sql: [], params: {}, additionalFrom: []};
	const typeClauses = params.type ? ` AND types @> ARRAY[${params.type}]` : '';
	let limitClause = '';
	let offsetClause = '';
	let orderClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	if (params.filter) orderClause = ', relevance desc';
	const query = sqlgetAllTags(filterClauses.sql, typeClauses, limitClause, offsetClause, orderClause, filterClauses.additionalFrom);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

function buildTagClauses(words: string): WhereClause {
	const sql = ['search_vector @@ query'];
	return {
		sql: sql,
		params: {tsquery: paramWords(words).join(' & ')},
		additionalFrom: [', to_tsquery(\'public.unaccent_conf\', :tsquery) as query, ts_rank_cd(search_vector, query) as relevance']
	};
}

export async function insertTag(tag: Tag) {
	await db().query(sqlinsertTag, [
		tag.tid,
		tag.name,
		tag.types,
		tag.short || null,
		tag.i18n || {},
		JSON.stringify(tag.aliases) || null,
		tag.tagfile,
		tag.repository,
		tag.modified_at,
		tag.problematic || false,
		tag.noLiveDownload || false,
		tag.priority || 0
	]);
}

export function updateKaraTagsTID(oldTID: string, newTID: string) {
	return db().query(sqlupdateKaraTagsTID, [
		oldTID,
		newTID
	]);
}

export async function selectDuplicateTags(): Promise<DBTag[]> {
	const res = await db().query(sqlselectDuplicateTags);
	return res.rows;
}

export async function updateKaraTags(kid: string, tags: TagAndType[]) {
	await db().query(sqldeleteTagsByKara, [kid]);
	for (const tag of tags) {
		await db().query(yesql(sqlinsertKaraTags)({
			kid: kid,
			tid: tag.tid,
			type: tag.type
		}));
	}
}

export async function selectTagByNameAndType(name: string, type: number): Promise<DBTag> {
	const res = await db().query(sqlgetTagByNameAndType, [
		name,
		[type]
	]);
	return res.rows[0];
}

export function updateTag(tag: Tag) {
	return db().query(sqlupdateTag, [
		tag.name,
		JSON.stringify(tag.aliases) || null,
		tag.tagfile,
		tag.short || null,
		tag.types,
		tag.i18n || {},
		tag.tid,
		tag.repository,
		tag.modified_at,
		tag.problematic || false,
		tag.noLiveDownload || false,
		tag.priority || 0
	]);
}

export async function removeTag(tid: string) {
	await db().query(sqldeleteTag, [tid]);
}

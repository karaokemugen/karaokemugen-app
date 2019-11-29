import {db, paramWords} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { TagParams, Tag, TagAndType } from '../lib/types/tag';
import { WhereClause } from '../types/database';
const sql = require('./sql/tag');

export async function selectTag(id: string): Promise<Tag> {
	const res = await db().query(sql.getTag, [id]);
	return res.rows[0];
}

export async function getAllTags(params: TagParams): Promise<Tag[]> {
	let filterClauses = params.filter
		? buildTagClauses(params.filter)
		: {sql: [], params: {}};
	let typeClauses = params.type ? ` AND types @> ARRAY[${params.type}]` : '';
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sql.getAllTags(filterClauses.sql, typeClauses, limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

function buildTagClauses(words: string): WhereClause {
	const params = paramWords(words);
	let sql = [];
	for (const word of Object.keys(params)) {
		sql.push(`lower(unaccent(name)) LIKE :${word} OR
		lower(unaccent(i18n::varchar)) LIKE :${word} OR
		lower(unaccent(search_aliases)) LIKE :${word}
		`);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function insertTag(tag: Tag) {
	return await db().query(sql.insertTag, [
		tag.tid,
		tag.name,
		tag.types,
		tag.short || null,
		tag.i18n || {},
		JSON.stringify(tag.aliases) || null,
		tag.tagfile
	]);
}

export async function updateKaraTagsTID(oldTID: string, newTID: string) {
	return await db().query(sql.updateKaraTagsTID, [
		oldTID,
		newTID
	]);
}

export async function selectDuplicateTags(): Promise<Tag[]> {
	return await db().query(sql.selectDuplicateTags);
}

export async function updateKaraTags(kid: string, tags: TagAndType[]) {
	await db().query(sql.deleteTagsByKara, [kid]);
	for (const tag of tags) {
		await db().query(yesql(sql.insertKaraTags)({
			kid: kid,
			tid: tag.tid,
			type: tag.type
		}));
	}
}

export async function selectTagByNameAndType(name: string, type: number): Promise<Tag> {
	const res = await db().query(sql.getTagByNameAndType, [
		name,
		[type]
	]);
	return res.rows[0];
}

export async function updateTag(tag: Tag) {
	return await db().query(sql.updateTag, [
		tag.name,
		JSON.stringify(tag.aliases) || null,
		tag.tagfile,
		tag.short || null,
		tag.types,
		tag.i18n || {},
		tag.tid,
	]);
}

export async function removeTag(tid: string) {
	await db().query(sql.deleteTag, [tid]);
}
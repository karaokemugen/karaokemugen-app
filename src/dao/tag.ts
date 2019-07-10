import {db, paramWords} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import slugify from 'slugify';
import { TagParams, Tag } from '../lib/types/tag';
import { DBTag } from '../types/database/tag';
import { WhereClause } from '../types/database';
const sql = require('./sql/tag');

export async function getTag(id: number): Promise<DBTag> {
	const res = await db().query(sql.getTag, [id]);
	return res.rows[0];
}

export async function getAllTags(params: TagParams): Promise<DBTag[]> {
	let filterClauses = params.filter
		? buildTagClauses(params.filter)
		: {sql: [], params: {}};
	let typeClauses = params.type ? ` AND tagtype = ${params.type}` : '';
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
		lower(unaccent(i18n::varchar)) LIKE :${word}
		`);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function checkOrCreateTag(tag: Tag): Promise<number> {
	const tagDB = await db().query(yesql(sql.getTagByNameAndType)({
		name: tag.tag,
		type: tag.type
	}));
	if (tagDB.rows.length > 0) return tagDB.rows[0].tag_id;
	//Tag does not exist, create it.
	const res = await db().query(yesql(sql.insertTag)({
		name: tag.tag,
		type: tag.type,
		slug: slugify(tag.tag),
		i18n: {}
	}));
	return res.rows[0].pk_id_tag;
}

export async function updateKaraTags(kid: string, tags: Tag[]) {
	await db().query(sql.deleteTagsByKara, [kid]);
	for (const tag of tags) {
		await db().query(yesql(sql.insertKaraTags)({
			kid: kid,
			tag_id: tag.id
		}));
	}
}
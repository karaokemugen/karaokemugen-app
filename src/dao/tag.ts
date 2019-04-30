import {db, paramWords} from './database';
import {pg as yesql} from 'yesql';
import slugify from 'slugify';
import {profile} from '../utils/logger';
import { TagParams, Tag } from '../types/tag';
const sql = require('./sql/tag');

export async function refreshTags() {
	profile('RefreshTags');
	await db().query('REFRESH MATERIALIZED VIEW all_tags');
	profile('RefreshTags');
}

export async function refreshKaraTags() {
	profile('RefreshKaraTags');
	await Promise.all([
		db().query('REFRESH MATERIALIZED VIEW author'),
		db().query('REFRESH MATERIALIZED VIEW creator'),
		db().query('REFRESH MATERIALIZED VIEW group_tags'),
		db().query('REFRESH MATERIALIZED VIEW language'),
		db().query('REFRESH MATERIALIZED VIEW singer'),
		db().query('REFRESH MATERIALIZED VIEW misc'),
		db().query('REFRESH MATERIALIZED VIEW songtype'),
		db().query('REFRESH MATERIALIZED VIEW songwriter')
	]);
	profile('RefreshKaraTags');
}

export async function getTag(id: number) {
	const res = await db().query(sql.getTag, [id]);
	return res.rows[0];
}

export async function getAllTags(params: TagParams) {
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

function buildTagClauses(words: string) {
	const params = paramWords(words);
	let sql = [];
	for (const i in words.split(' ').filter(s => !('' === s))) {
		sql.push(`lower(unaccent(name)) LIKE :word${i} OR
		lower(unaccent(i18n::varchar)) LIKE :word${i}
		`);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function checkOrCreateTag(tag: Tag) {
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
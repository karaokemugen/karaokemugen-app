import {db, paramWords} from './database';
import {pg as yesql} from 'yesql';
import slug from 'slug';
import logger from 'winston';
const sql = require('./sql/tag');

export async function refreshTags() {
	logger.profile('RefreshTags');
	await db().query('REFRESH MATERIALIZED VIEW all_tags');
	logger.profile('RefreshTags');
}

export async function refreshKaraTags() {
	logger.profile('RefreshKaraTags');
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
	logger.profile('RefreshKaraTags');
}

export async function getTag(id) {
	const res = await db().query(sql.getTag, [id]);
	return res.rows[0];
}

export async function getAllTags(filter, type, from, size) {
	let filterClauses = filter ? buildTagClauses(filter) : {sql: [], params: {}};
	let typeClauses = type ? ` AND tagtype = ${type}` : '';
	let limitClause = '';
	let offsetClause = '';
	if (from > 0) offsetClause = `OFFSET ${from} `;
	if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getAllTags(filterClauses.sql, typeClauses, limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

function buildTagClauses(words) {
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

export async function checkOrCreateTag(tag) {
	const tagDB = await db().query(yesql(sql.getTagByNameAndType)({
		name: tag.tag,
		type: tag.type
	}));
	if (tagDB.rows.length > 0) return tagDB.rows[0].tag_id;
	//Tag does not exist, create it.
	slug.defaults.mode = 'rfc3986';
	const res = await db().query(yesql(sql.insertTag)({
		name: tag.tag,
		type: tag.type,
		slug: slug(tag.tag, { lower: true }),
		i18n: {}
	}));
	return res.rows[0].pk_id_tag;
}

export async function updateKaraTags(kid, tags) {
	await db().query(sql.deleteTagsByKara, [kid]);
	for (const tag of tags) {
		await db().query(yesql(sql.insertKaraTags)({
			kid: kid,
			tag_id: tag.id
		}));
	}
}
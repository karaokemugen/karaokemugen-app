import {db} from './database';
import deburr from 'lodash.deburr';
import {pg as yesql} from 'yesql';
import slug from 'slug';
const sql = require('./sql/tag');

export async function refreshTags() {
	return await db().query('REFRESH MATERIALIZED VIEW all_tags');
}

export async function getTag(id) {
	const res = await db().query(sql.getTag, [id]);
	return res.rows[0];
}

export async function getAllTags() {
	const res = await db().query(sql.getAllTags);
	return res.rows;
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

export async function updateKaraTags(kara_id, tags) {
	await db().query(sql.deleteTagsByKara, [kara_id]);
	for (const tag of tags) {
		await db().query(yesql(sql.insertKaraTags)({
			kara_id: kara_id,
			tag_id: tag.id
		}));
	}
}
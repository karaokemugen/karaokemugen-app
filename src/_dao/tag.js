import {getUserDb} from './database';
import deburr from 'lodash.deburr';

const sql = require('../_common/db/tag');

export async function getTag(id) {
	return await getUserDb().get(sql.getTag, { $id: id });
}

export async function getAllTags() {
	return await getUserDb().all(sql.getAllTags);
}

export async function checkOrCreateTag(tag) {	
	const tagDB = await getUserDb().get(sql.getTagByNameAndType, {
		$name: tag.tag,
		$type: tag.type
	});
	if (tagDB) return tagDB.tag_id;
	//Tag does not exist, create it.
	const res = await getUserDb().run(sql.insertTag, {
		$name: tag.tag,
		$NORM_name: deburr(tag.tag),
		$type: tag.type
	});
	return res.lastID;
}

export async function updateKaraTags(kara_id, tags) {
	await getUserDb().run(sql.deleteTagsByKara, { $kara_id: kara_id });
	for (const tag of tags) {
		await getUserDb().run(sql.insertKaraTags, {
			$kara_id: kara_id,
			$tag_id: tag.id
		});
	}	
}
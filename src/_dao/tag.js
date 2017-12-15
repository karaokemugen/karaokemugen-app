import {getUserDb} from './database';
const sql = require('../_common/db/tag');

export async function getTag(id) {
	return await getUserDb().get(sql.getTag,
		{
			$id: id
		});
}

export async function getAllTags() {
	return await getUserDb().all(sql.getAllTags);
}
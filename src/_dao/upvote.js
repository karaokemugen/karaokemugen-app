import {getUserDb} from './database';
const sql = require('../_common/db/upvote');

export async function getUpvotesByPLC(plc_id) {
	return await getUserDb().all(sql.selectUpvoteByPLC, {$plc_id: plc_id});
}

export async function insertUpvote(plc_id,user_id) {
	return await getUserDb().run(sql.insertUpvote, {
		$plc_id: plc_id,
		$user_id: user_id
	});
}
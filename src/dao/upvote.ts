import {db} from './database';
import {pg as yesql} from 'yesql';
const sql = require('./sql/upvote');

export async function getUpvotesByPLC(plc_id: number) {
	const res = await db().query(sql.selectUpvoteByPLC, [plc_id]);
	return res.rows;
}

export async function insertUpvote(plc_id: number, username: string) {
	return await db().query(yesql(sql.insertUpvote)({
		plc_id: plc_id,
		username: username
	}));
}

export async function removeUpvote(plc_id: number, username: string) {
	return await db().query(yesql(sql.deleteUpvote)({
		plc_id: plc_id,
		username: username
	}));
}
import {pg as yesql} from 'yesql';

import {db} from '../lib/dao/database';
import { DBUpvote } from '../types/database/upvote';
import { sqldeleteUpvote,sqlinsertUpvote, sqlselectUpvoteByPLC } from './sql/upvote';

export async function selectUpvotesByPLC(plc_id: number): Promise<DBUpvote[]> {
	const res = await db().query(sqlselectUpvoteByPLC, [plc_id]);
	return res.rows;
}

export function insertUpvote(plc_id: number, username: string) {
	return db().query(yesql(sqlinsertUpvote)({
		plc_id: plc_id,
		username: username
	}));
}

export function deleteUpvote(plc_id: number, username: string) {
	return db().query(yesql(sqldeleteUpvote)({
		plc_id: plc_id,
		username: username
	}));
}
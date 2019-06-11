import {db} from '../lib/dao/database';
import { DBRepo } from '../types/database/repo';
const sql = require('./sql/repo');

export async function selectRepos(): Promise<DBRepo[]> {
	const repos = await db().query(sql.selectRepos);
	return repos.rows;
}

import {db} from './database';
const sql = require('./sql/repo');

export async function selectRepos(): Promise<any[]> {
	const repos = await db().query(sql.selectRepos);
	return repos.rows;
}

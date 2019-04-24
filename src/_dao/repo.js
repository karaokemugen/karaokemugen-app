import {db} from './database';
const sql = require('./sql/repo');

export async function selectRepos() {
	const repos = await db().query(sql.selectRepos);
	return repos.rows;
}

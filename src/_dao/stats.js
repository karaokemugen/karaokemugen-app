import {db} from './database';
const sql = require('./sql/stats');

export async function exportViewcounts() {
	const res = await db().query(sql.exportViewcounts);
	return res.rows[0];
}

export async function exportRequests() {
	const res = await db().query(sql.exportRequests);
	return res.rows;
}

export async function exportFavorites() {
	const res = await db().query(sql.exportFavorites);
	return res.rows;
}
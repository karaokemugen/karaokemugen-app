import {db} from './database';
const sql = require('./sql/stats');

export async function exportPlayed() {
	const res = await db().query(sql.exportPlayed);
	return res.rows;
}

export async function exportRequests() {
	const res = await db().query(sql.exportRequested);
	return res.rows;
}

export async function exportFavorites() {
	const res = await db().query(sql.exportFavorites);
	return res.rows;
}
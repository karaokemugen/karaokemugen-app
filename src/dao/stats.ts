import {db} from '../lib/dao/database';
import { DBStatsPlayed, DBStatsRequested, DBStatsFavorites } from '../types/database/stats';
const sql = require('./sql/stats');

export async function exportPlayed(): Promise<DBStatsPlayed[]> {
	const res = await db().query(sql.exportPlayed);
	return res.rows;
}

export async function exportRequests(): Promise<DBStatsRequested[]> {
	const res = await db().query(sql.exportRequested);
	return res.rows;
}

export async function exportFavorites(): Promise<DBStatsFavorites[]> {
	const res = await db().query(sql.exportFavorites);
	return res.rows;
}
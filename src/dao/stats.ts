import { db } from '../lib/dao/database.js';
import { DBStatsPlayed, DBStatsRequested } from '../types/database/stats.js';
import { sqlexportPlayed, sqlexportRequested } from './sql/stats.js';

export async function selectPlayed(): Promise<DBStatsPlayed[]> {
	const res = await db().query(sqlexportPlayed);
	return res.rows;
}

export async function selectRequests(): Promise<DBStatsRequested[]> {
	const res = await db().query(sqlexportRequested);
	return res.rows;
}

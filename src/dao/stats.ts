import {db} from '../lib/dao/database';
import { DBStatsFavorites,DBStatsPlayed, DBStatsRequested } from '../types/database/stats';
import { sqlexportFavorites,sqlexportPlayed, sqlexportRequested } from './sql/stats';

export async function exportPlayed(): Promise<DBStatsPlayed[]> {
	const res = await db().query(sqlexportPlayed);
	return res.rows;
}

export async function exportRequests(): Promise<DBStatsRequested[]> {
	const res = await db().query(sqlexportRequested);
	return res.rows;
}

export async function exportFavorites(): Promise<DBStatsFavorites[]> {
	const res = await db().query(sqlexportFavorites);
	return res.rows;
}
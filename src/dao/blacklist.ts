import {pg as yesql} from 'yesql';

import { buildClauses, db, transaction } from '../lib/dao/database';
import {KaraParams} from '../lib/types/kara';
import {BLC, BLCSet} from '../types/blacklist';
import { DBBlacklist,DBBLC } from '../types/database/blacklist';
import { sqladdBlacklistCriteria,sqlcopyBLCSet,sqlcreateSet,sqldeleteBlacklistCriteria,sqldeleteSet,sqleditSet,sqlemptyBlacklist,sqlemptyBlacklistCriterias,sqlgenerateBlacklist,sqlgetBlacklistContents,sqlgetBlacklistCriterias,sqlselectCurrentBLCSet,sqlselectSet,sqlselectSets,sqlunsetCurrentSet } from './sql/blacklist';

export function editBLCSet(blcset: BLCSet) {
	return db().query(yesql(sqleditSet)({
		blc_set_id: blcset.blc_set_id,
		name: blcset.name,
		modified_at: blcset.modified_at || new Date(),
		flag_current: blcset.flag_current || false
	}));
}

export async function createBLCSet(blcset: BLCSet): Promise<number> {
	const res = await db().query(yesql(sqlcreateSet)({
		name: blcset.name,
		created_at: blcset.created_at,
		modified_at: blcset.modified_at,
		flag_current: blcset.flag_current || false
	}));
	return res.rows[0]?.pk_id_blc_set;
}

export function copyBLCSet(fromID: number, toID: number) {
	return db().query(sqlcopyBLCSet, [fromID, toID]);
}

export function deleteSet(id: number) {
	return db().query(sqldeleteSet, [id]);
}

export function unsetCurrentSet() {
	return db().query(sqlunsetCurrentSet);
}

export function emptyBlacklistCriterias(set_id: number) {
	return db().query(sqlemptyBlacklistCriterias, [set_id]);
}

export async function getCurrentBLCSet(): Promise<BLCSet> {
	const res = await db().query(sqlselectCurrentBLCSet);
	return res.rows[0];
}

export async function generateBlacklist() {
	const blcset = await getCurrentBLCSet();
	await db().query(sqlemptyBlacklist);
	return db().query(sqlgenerateBlacklist, [blcset?.blc_set_id || 0]);
}

export async function selectSet(id: number): Promise<BLCSet> {
	const res = await db().query(sqlselectSet, [id]);
	return res.rows[0];
}

export async function selectSets(): Promise<BLCSet[]> {
	const res = await db().query(sqlselectSets);
	return res.rows;
}

export async function getBlacklistCriterias(set_id: number): Promise<DBBLC[]> {
	const res = await db().query(sqlgetBlacklistCriterias, [set_id]);
	return res.rows;
}

export function deleteBlacklistCriteria(blc_id: number) {
	return db().query(sqldeleteBlacklistCriteria, [blc_id]);
}

export async function getBlacklistContents(params: KaraParams): Promise<DBBlacklist[]> {
	const filterClauses = params.filter ? buildClauses(params.filter) : {sql: [], params: {}, additionalFrom: []};
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sqlgetBlacklistContents(filterClauses.sql, limitClause, offsetClause, filterClauses.additionalFrom);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export function addBlacklistCriteria(blcList: BLC[]) {
	const blc = blcList.map((blcItem) => ([
		blcItem.value,
		blcItem.type,
		blcItem.blc_set_id
	]));
	return transaction({params: blc, sql: sqladdBlacklistCriteria});
}

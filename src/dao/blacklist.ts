import {pg as yesql} from 'yesql';

import {buildClauses, db, transaction} from '../lib/dao/database';
import {KaraParams} from '../lib/types/kara';
import {BLC} from '../types/blacklist';
import { DBBlacklist,DBBLC } from '../types/database/blacklist';
const sql = require('./sql/blacklist');

export function emptyBlacklistCriterias() {
	return db().query(sql.emptyBlacklistCriterias);
}

export function generateBlacklist() {
	return db().query(sql.generateBlacklist);
}

export async function getBlacklistCriterias(): Promise<DBBLC[]> {
	const res = await db().query(sql.getBlacklistCriterias);
	return res.rows;
}

export function deleteBlacklistCriteria(blc_id: number) {
	return db().query(sql.deleteBlacklistCriteria, [blc_id]);
}

export async function getBlacklistContents(params: KaraParams): Promise<DBBlacklist[]> {
	const filterClauses = params.filter ? buildClauses(params.filter) : {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sql.getBlacklistContents(filterClauses.sql, limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export function addBlacklistCriteria(blcList: BLC[]) {
	const blc = blcList.map((blcItem) => ([
		blcItem.value,
		blcItem.type
	]));
	return transaction([{params: blc, sql: sql.addBlacklistCriteria}]);
}

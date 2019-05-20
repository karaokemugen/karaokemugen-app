import {langSelector, buildClauses, db, transaction} from './database';
import {pg as yesql} from 'yesql';
import {BLC} from '../types/blacklist';
import {KaraParams} from '../types/kara';
import { DBBLC, DBBlacklist } from '../types/database/blacklist';
const sql = require('./sql/blacklist');

export async function emptyBlacklistCriterias() {
	return await db().query(sql.emptyBlacklistCriterias);
}

export async function generateBlacklist() {
	return await db().query(sql.generateBlacklist);
}

export async function getBlacklistCriterias(): Promise<DBBLC[]> {
	const res = await db().query(sql.getBlacklistCriterias);
	return res.rows;
}

export async function deleteBlacklistCriteria(blc_id: number) {
	return await db().query(sql.deleteBlacklistCriteria, [blc_id]);
}

export async function getBlacklistContents(params: KaraParams): Promise<DBBlacklist[]> {
	const filterClauses = params.filter ? buildClauses(params.filter) : {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	//Disabled until frontend manages this
	//if (from > 0) offsetClause = `OFFSET ${input.from} `;
	//if (size > 0) limitClause = `LIMIT ${input.size} `;
	const query = sql.getBlacklistContents(filterClauses.sql, langSelector(params.lang), limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function isBLCriteria(blc_id: number): Promise<boolean> {
	const res = await db().query(sql.isBLCriteria, [blc_id]);
	return res.rows.length > 0;
}

export async function editBlacklistCriteria(blc: BLC) {
	return await db().query(yesql(sql.editBlacklistCriteria)(blc));
}

export async function addBlacklistCriteria(blcList: BLC[]) {
	const blc = blcList.map((blcItem) => ([
		blcItem.value,
		blcItem.type,
		blcItem.uniquevalue
	]));
	return await transaction([{params: blc, sql: sql.addBlacklistCriteria}]);
}

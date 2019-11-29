import {langSelector, buildClauses, db, transaction} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import {BLC} from '../types/blacklist';
import {KaraParams} from '../lib/types/kara';
import { DBBLC, DBBlacklist } from '../types/database/blacklist';
import { getUser } from './user';
import { User } from '../lib/types/user';
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
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	let user: User = {};
	let userMode = -1;
	let userLangs = {main: null, fallback: null};
	if (params.username) user = await getUser(params.username);
	if (user) {
		userMode = user.series_lang_mode;
		userLangs = {main: user.main_series_lang, fallback: user.fallback_series_lang};
	}
	const query = sql.getBlacklistContents(filterClauses.sql, langSelector(params.lang, userMode, userLangs ), limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function addBlacklistCriteria(blcList: BLC[]) {
	const blc = blcList.map((blcItem) => ([
		blcItem.value,
		blcItem.type
	]));
	return await transaction([{params: blc, sql: sql.addBlacklistCriteria}]);
}

import {transaction, langSelector, buildClauses, db} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { KaraParams } from '../lib/types/kara';
import { DBWhitelist } from '../types/database/whitelist';
import { User } from '../lib/types/user';
import { getUser } from './user';
const sql = require('./sql/whitelist');


export async function getWhitelistContents(params: KaraParams): Promise<DBWhitelist[]> {
	const filterClauses = params.filter
		? buildClauses(params.filter)
		: {sql: [], params: {}};
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
	const query = sql.getWhitelistContents(filterClauses.sql, langSelector(params.lang, userMode, userLangs), limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function emptyWhitelist() {
	return await db().query(sql.emptyWhitelist);
}

export async function removeKaraFromWhitelist(wlcList: string[]) {
	const karas = wlcList.map(kara => ([
		kara
	]));
	return await transaction([{params: karas, sql: sql.removeKaraFromWhitelist}]);
}

export async function addKaraToWhitelist(karaList: string[], reason: string) {
	const karas = karaList.map((kara) => ([
		kara,
		new Date(),
		reason
	]));
	return await transaction([{params: karas, sql: sql.addKaraToWhitelist}]);
}

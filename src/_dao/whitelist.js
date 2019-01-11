import {transaction, langSelector, buildClauses, db} from './database';
import {now} from 'unix-timestamp';
import {pg as yesql} from 'yesql';
const sql = require('./sql/whitelist');


export async function getWhitelistContents(filter, lang, from = 0, size = 0) {
	const filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	if (from > 0) offsetClause = `OFFSET ${from} `;
	if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getWhitelistContents(filterClauses.sql, langSelector(lang), limitClause, offsetClause);

	const res = db().query(yesql(query)(filterClauses.params));
	return res.rows;
}
export async function emptyWhitelist() {
	return await db().query(sql.emptyWhitelist);
}

export async function removeKaraFromWhitelist(wlcList) {
	const wlcs = wlcList.map((wlc) => ({ wlc_id: wlc.wlc_id }));
	return await transaction([{params: wlcs, sql: sql.removeKaraFromWhitelist}]);
}

export async function addKaraToWhitelist(karaList) {
	const karas = karaList.map((kara) => ({
		kara_id: kara,
		created_at: new Date()
	}));
	return await transaction([{params: karas, sql: sql.addKaraToWhitelist}]);
}

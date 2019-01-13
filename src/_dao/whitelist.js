import {transaction, langSelector, buildClauses, db} from './database';
import {pg as yesql} from 'yesql';
const sql = require('./sql/whitelist');


export async function getWhitelistContents(filter, lang, from = 0, size = 0) {
	const filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	//Disabled until frontend manages this
	//if (from > 0) offsetClause = `OFFSET ${from} `;
	//if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getWhitelistContents(filterClauses.sql, langSelector(lang), limitClause, offsetClause);

	const res = db().query(yesql(query)(filterClauses.params));
	return res.rows;
}
export async function emptyWhitelist() {
	return await db().query(sql.emptyWhitelist);
}

export async function removeKaraFromWhitelist(wlcList) {
	return await transaction([{params: wlcList, sql: sql.removeKaraFromWhitelist}]);
}

export async function addKaraToWhitelist(karaList) {
	const karas = karaList.map((kara) => ([
		kara,
		new Date()
	]));
	return await transaction([{params: karas, sql: sql.addKaraToWhitelist}]);
}

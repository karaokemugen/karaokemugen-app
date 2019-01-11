import {langSelector, buildClauses, db, transaction} from './database';
import {pg as yesql} from 'yesql';

const sql = require('./sql/blacklist');

export async function emptyBlacklistCriterias() {
	return await db().query(sql.emptyBlacklistCriterias);
}

export async function generateBlacklist() {
	return await db().query(sql.generateBlacklist);
}

export async function getBlacklistCriterias() {
	const res = db().query(sql.getBlacklistCriterias);
	return res.rows;
}

export async function deleteBlacklistCriteria(blc_id) {
	return await db().query(sql.deleteBlacklistCriteria, [blc_id]);
}

export async function getBlacklistContents(filter, lang, from = 0, size = 0) {
	const filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	if (from > 0) offsetClause = `OFFSET ${from} `;
	if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getBlacklistContents(filterClauses.sql, langSelector(lang), limitClause, offsetClause);

	const res = db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function isBLCriteria(blc_id) {
	const res = await db().query(sql.isBLCriteria, [blc_id]);
	return res.rows.length > 0;
}

export async function editBlacklistCriteria(blc) {
	return await db().query(yesql(sql.editBlacklistCriteria)({
		id: blc.id,
		type: blc.type,
		value: blc.value
	}));
}

export async function addBlacklistCriteria(blcList) {
	const blc = blcList.map((blcItem) => ({
		blcvalue: blcItem.blcvalue,
		blctype: blcItem.blctype,
		blcuniquevalue: blcItem.blcuniquevalue
	}));
	return await transaction([{params: blc, sql: sql.addBlacklistCriteria}]);
}

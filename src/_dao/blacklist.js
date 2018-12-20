import {langSelector, buildClauses, getUserDb, transaction} from './database';

const sql = require('./sql/blacklist');

export async function emptyBlacklistCriterias() {
	return await getUserDb().run(sql.emptyBlacklistCriterias);
}

export async function generateBlacklist() {
	return await getUserDb().exec(sql.generateBlacklist);
}

export async function getBlacklistCriterias() {
	return await getUserDb().all(sql.getBlacklistCriterias);
}

export async function deleteBlacklistCriteria(blc_id) {
	return await getUserDb().run(sql.deleteBlacklistCriteria, { $id: blc_id });
}

export async function getBlacklistContents(filter, lang) {
	//if (injectionTest(filter)) throw `Possible SQL injection : ${filter}`;
	const filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	const query = sql.getBlacklistContents(filterClauses.sql, langSelector(lang));

	return await getUserDb().all(query, filterClauses.params);
}

export async function isBLCriteria(blc_id) {
	const res = await getUserDb().get(sql.isBLCriteria, { $id: blc_id });
	return !!res;
}

export async function editBlacklistCriteria(blc) {
	return await getUserDb().run(sql.editBlacklistCriteria, {
		$id: blc.id,
		$type: blc.type,
		$value: blc.value
	});
}

export async function addBlacklistCriteria(blcList) {
	const blc = blcList.map((blcItem) => ({
		$blcvalue: blcItem.blcvalue,
		$blctype: blcItem.blctype,
		$blcuniquevalue: blcItem.blcuniquevalue
	}));
	return await transaction(blc, sql.addBlacklistCriteria);
}

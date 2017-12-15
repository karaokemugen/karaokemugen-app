import {getUserDb, transaction} from './database';
const sql = require('../_common/db/blacklist');

export async function emptyBlacklistCriterias() {
	return await getUserDb().run(sql.emptyBlacklistCriterias);
}

export async function generateBlacklist() {
	return await getUserDb().run(sql.generateBlacklist);
}

export async function getBlacklistCriterias() {
	return await getUserDb().all(sql.getBlacklistCriterias);
}

export async function deleteBlacklistCriteria(blc_id) {
	return await getUserDb().run(sql.deleteBlacklistCriteria,
		{
			$id: blc_id
		});
}

export async function getBlacklistContents() {
	return await getUserDb().all(sql.getBlacklistContents);
}

export async function isBLCriteria(blc_id) {
	const res = await getUserDb().get(sql.isBLCriteria,
		{
			$id: blc_id
		});
	// FIXME: Until playlist_controller is reworked as ES2015+, logic is here. 
	if (res) return true;
	return false;
}

export async function editBlacklistCriteria(blc) {
	return await getUserDb().run(sql.editBlacklistCriteria,
		{
			$id: blc.id,
			$type: blc.type,
			$value: blc.value
		});
}

export async function addBlacklistCriteria(blcList) {
	let blc = [];
	blcList.forEach((blcItem) => {
		blc.push({
			$blcvalue: blcItem.blcvalue,
			$blctype: blcItem.blctype,
			$blcuniquevalue: blcItem.blcuniquevalue
		});
	});
	return await transaction(blc, sql.addBlacklistCriteria);
}

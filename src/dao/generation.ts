import {selectBLCTags, selectTags, selectDLBLCTags} from './sql/generation';
import { generateBlacklist } from './blacklist';
import logger from '../lib/utils/logger';
import { Tag } from '../lib/types/tag';
import {db} from '../lib/dao/database';

/**
 * @function run_userdb_integrity_checks
 * Get all tags and compare to the ones in the blacklist criterias, if any.
 * If tag IDs have changed, update them in blacklist criterias.
 */
export async function checkUserDBIntegrity() {
	logger.debug('[Gen] Running user database integrity checks');
	const [
		allTags,
		blcTags,
		dlblcTags,
	] = await Promise.all([
		db().query(selectTags),
		db().query(selectBLCTags),
		db().query(selectDLBLCTags)
	]);

	let sql = '';

	blcTags.rows.forEach((blcTag: Tag ) => {
		let tagFound = false;
		allTags.rows.forEach((tag: Tag) => {
			if (tag.name === blcTag.name && tag.type === blcTag.type) {
				// Found a matching Tagname, checking if id_tags are the same
				if (tag.id !== blcTag.id) {
					sql += `UPDATE blacklist_criteria SET value = ${tag.id}
						WHERE uniquevalue = '${blcTag.name}' AND type = ${blcTag.type};`;
				}
				tagFound = true;
			}
		});
		//If No Tag with this name and type was found in the AllTags table, delete the Tag
		if (!tagFound) {
			sql += `DELETE FROM blacklist_criteria WHERE uniquevalue = '${blcTag.name}' AND type = ${blcTag.type};`;
			logger.warn(`[Gen] Deleted Tag ${blcTag.name} from blacklist criteria (type ${blcTag.type})`);
		}
	});
	dlblcTags.rows.forEach((blcTag: Tag ) => {
		let tagFound = false;
		allTags.rows.forEach((tag: Tag) => {
			if (tag.name === blcTag.name && tag.type === blcTag.type) {
				// Found a matching Tagname, checking if id_tags are the same
				if (tag.id !== blcTag.id) {
					sql += `UPDATE download_blacklist_criteria SET value = ${tag.id}
						WHERE uniquevalue = '${blcTag.name}' AND type = ${blcTag.type};`;
				}
				tagFound = true;
			}
		});
		//If No Tag with this name and type was found in the AllTags table, delete the Tag
		if (!tagFound) {
			sql += `DELETE FROM download_blacklist_criteria WHERE uniquevalue = '${blcTag.name}' AND type = ${blcTag.type};`;
			logger.warn(`[Gen] Deleted Tag ${blcTag.name} from blacklist criteria (type ${blcTag.type})`);
		}
	});
	if (sql) {
		logger.debug( '[Gen] UPDATE SQL : ' + sql);
		await db().query(`
		BEGIN;
		${sql}
		COMMIT;
		`);
	}
	await generateBlacklist();
	logger.debug('[Gen] Integrity checks complete, database generated');
}
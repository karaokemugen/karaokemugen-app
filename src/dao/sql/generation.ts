/** Requêtes SQL utilisées. */

export const selectTags = 'SELECT pk_id_tag as id, tagtype AS type, name FROM tag;';

export const selectBLCTags = `SELECT type, value AS id_tag, uniquevalue AS name FROM blacklist_criteria
	WHERE type > 0 AND type < 1000;`;

export const selectDLBLCTags = `SELECT type, value AS id_tag, uniquevalue AS name FROM download_blacklist_criteria
	WHERE type > 0 AND type < 1000;`;

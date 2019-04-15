/** Requêtes SQL utilisées. */

export const selectTags = 'SELECT pk_id_tag as id_tag, tagtype, name FROM tag;';

export const selectBLCTags = `SELECT type, value AS id_tag, uniquevalue AS tagname FROM blacklist_criteria
	WHERE type > 0 AND type < 1000;`;

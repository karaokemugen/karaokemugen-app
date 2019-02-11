/** Requêtes SQL utilisées. */

export const insertKaras = `INSERT INTO kara(pk_kid, title, year, songorder, mediafile, subfile, created_at,
	modified_at, gain, duration, karafile, mediasize)
	VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;

export const inserti18nSeries = 'INSERT INTO serie_lang(fk_sid, lang, name) VALUES((SELECT pk_sid FROM serie WHERE name = $3), $1, $2);';

export const insertSeries = 'INSERT INTO serie(name, aliases, pk_sid, seriefile) VALUES($1, $2, $3, $4);';

export const insertTags = `INSERT INTO tag(pk_id_tag, tagtype, name, slug, i18n)
	VALUES($1, $2, $3, $4, $5);`;

export const insertKaraTags = 'INSERT INTO kara_tag(fk_id_tag, fk_kid) VALUES($1, $2);';

export const insertKaraSeries = 'INSERT INTO kara_serie(fk_sid, fk_kid) VALUES($1, $2);';

export const selectTags = 'SELECT pk_id_tag as id_tag, tagtype, name FROM tag;';

export const selectBLCTags = `SELECT type, value AS id_tag, uniquevalue AS tagname FROM blacklist_criteria
	WHERE type > 0 AND type < 1000;`;

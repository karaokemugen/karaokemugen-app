/** Requêtes SQL utilisées. */

export const insertKaras = `INSERT INTO kara(pk_id_kara, kid, title, year, songorder, mediafile, subfile, created_at,
	modified_at, gain, duration, karafile, mediasize)
	VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`;

export const inserti18nSeries = 'INSERT INTO serie_lang(fk_id_serie, lang, name) VALUES((SELECT pk_id_serie FROM serie WHERE name = $3), $1, $2);';

export const insertSeries = 'INSERT INTO serie(pk_id_serie, name, aliases, sid, seriefile) VALUES($1, $2, $3, $4, $5);';

export const insertTags = `INSERT INTO tag(pk_id_tag, tagtype, name, slug, i18n)
	VALUES($1, $2, $3, $4, $5);`;

export const insertKaraTags = 'INSERT INTO kara_tag(fk_id_tag, fk_id_kara) VALUES($1, $2);';

export const insertKaraSeries = 'INSERT INTO kara_serie(fk_id_serie, fk_id_kara) VALUES($1, $2);';

export const selectRequestKaras = 'SELECT fk_id_kara AS id_kara, kid FROM requested;';

export const selectKaras = 'SELECT pk_id_kara AS id_kara, kid FROM kara;';

export const selectPlayedKaras = 'SELECT fk_id_kara AS id_kara, kid FROM played;';

export const selectTags = 'SELECT pk_id_tag AS id_tag, tagtype, name FROM tag;';

export const selectPlaylistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM playlist_content;';

export const selectWhitelistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM whitelist;';

export const selectBlacklistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM blacklist;';

export const selectBLCKaras = 'SELECT value AS id_kara, uniquevalue AS kid FROM blacklist_criteria WHERE type = 1001;';

export const selectBLCTags = `SELECT type, value AS id_tag, uniquevalue AS tagname FROM blacklist_criteria
	WHERE type > 0 AND type < 1000;`;

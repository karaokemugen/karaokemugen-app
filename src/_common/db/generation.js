/** Requêtes SQL utilisées. */

export const insertKaras = `INSERT INTO kara(pk_id_kara, kid, title, NORM_title, year, songorder, videofile, created_at,
	modified_at, gain, videolength,checksum)
	VALUES($id_kara, $kara_KID, $kara_title, $titlenorm, $kara_year, $kara_songorder, $kara_videofile, $kara_dateadded,
	$kara_datemodif, $kara_gain, $kara_videolength, $kara_checksum);`;

export const insertSeries = 'INSERT INTO serie(pk_id_serie, name, NORM_name) VALUES($id_serie, $serie, $serienorm );';

export const insertTags = `INSERT INTO tag(pk_id_tag, tagtype, name, NORM_name)
	VALUES($id_tag, $tagtype, $tagname, $tagnamenorm);`;

export const insertKaraTags = 'INSERT INTO kara_tag(fk_id_tag, fk_id_kara) VALUES($id_tag, $id_kara);';

export const insertKaraSeries = 'INSERT INTO kara_serie(fk_id_serie, fk_id_kara) VALUES($id_serie, $id_kara);';

export const updateSeriesAltNames = `UPDATE serie SET altname = $serie_altnames ,NORM_altname = $serie_altnamesnorm
	WHERE name= $serie_name ;`;

export const selectTags = 'SELECT pk_id_tag AS id_tag, tagtype, name FROM tag;';

export const selectKaras = 'SELECT kara_id AS id_kara, kid FROM all_karas;';

export const selectPlaylistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM playlist_content;';

export const selectWhitelistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM whitelist;';

export const selectBlacklistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM blacklist;';

export const selectBLCKaras = 'SELECT value AS id_kara, uniquevalue AS kid FROM blacklist_criteria WHERE type = 1001;';

export const selectBLCTags = `SELECT type, value AS id_tag, uniquevalue AS tagname FROM blacklist_criteria
    WHERE type > 0 AND type < 1000;`;

export const selectViewcountKaras = 'SELECT fk_id_kara AS id_kara, kid FROM viewcount;';
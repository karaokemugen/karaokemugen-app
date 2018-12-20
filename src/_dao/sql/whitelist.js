// SQL for whitelist management

export const emptyWhitelist = 'DELETE FROM whitelist;';

export const addKaraToWhitelist = `INSERT INTO whitelist(fk_id_kara,kid,created_at)
								SELECT $kara_id,kid,$created_at
								FROM karasdb.kara
								WHERE PK_id_kara = $kara_id;
								`;

export const getWhitelistContents = (filterClauses, lang) => `SELECT wl.pk_id_whitelist AS whitelist_id,
      									ak.kara_id AS kara_id,
      									ak.kid AS kid,
      									ak.title AS title,
      									(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
										(SELECT COUNT(pk_id_request) AS request FROM request WHERE fk_id_kara = ak.kara_id) AS requested,
      									ak.songorder AS songorder,
      									COALESCE(
									  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
									  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
									  ak.serie) AS serie,
										COALESCE(
									  (SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
									  (SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
									  ak.NORM_serie) AS NORM_serie,
      									ak.serie_altname AS serie_altname,
										ak.serie_i18n AS serie_i18n,
										ak.NORM_serie_i18n AS NORM_serie_i18n,
										ak.NORM_serie AS NORM_serie_orig,
										ak.serie AS serie_orig,
      									ak.singer AS singer,
      									ak.songwriter AS songwriter,
	  									ak.year AS year,
      									ak.songtype AS songtype,
      									ak.creator AS creator,
      									ak.language AS language,
      									ak.author AS author,
      									ak.misc AS misc,
      									ak.duration AS duration,
      									wl.created_at AS created_at,
      									ak.mediafile AS mediafile,
										ak.NORM_serie_altname AS NORM_serie_altname,
										ak.NORM_singer AS NORM_singer,
										ak.NORM_title AS NORM_title,
										ak.NORM_creator AS NORM_creator,
										ak.NORM_author AS NORM_author,
										ak.NORM_songwriter AS NORM_songwriter
 									FROM karasdb.all_karas AS ak
									INNER JOIN whitelist AS wl ON wl.fk_id_kara = ak.kara_id
									WHERE 1 = 1
									${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
									ORDER BY language, ak.serie IS NULL, serie COLLATE NOCASE, songtype DESC, songorder, singer COLLATE NOCASE, title COLLATE NOCASE
									`;

export const removeKaraFromWhitelist = `DELETE FROM whitelist
									WHERE pk_id_whitelist = $wlc_id;
									`;


// SQL for whitelist management

export const emptyWhitelist = 'DELETE FROM whitelist;';

export const addKaraToWhitelist = `
INSERT INTO whitelist(
	fk_id_kara,
	kid,
	created_at
)
	SELECT $1,kid,$2
	FROM kara
	WHERE pk_id_kara = $1;
`;

export const getWhitelistContents = (filterClauses, lang, limitClause, offsetClause) => `
SELECT ak.kara_id AS kara_id,
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie_altname AS serie_altname,
  ak.serie_i18n AS serie_i18n,
  ak.serie_id AS serie_id,
  ak.seriefiles AS seriefiles,
  ak.subfile AS subfile,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize
  (
	SELECT COUNT(pk_id_viewcount) AS viewcount
	FROM viewcount
	WHERE fk_id_kara = ak.kara_id
  ) AS viewcount,
  (
	SELECT COUNT(pk_id_request) AS request
	FROM request
	WHERE fk_id_kara = ak.kara_id
  ) AS requested,
  ak.duration AS duration,
  wl.created_at AS created_at,
  FROM all_karas AS ak
  INNER JOIN whitelist AS wl ON wl.fk_id_kara = ak.kara_id
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.languages_sortable, ak.serie IS NULL, lower(unaccent(serie)), ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(singers_sortable)), lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const removeKaraFromWhitelist = `
DELETE FROM whitelist
WHERE pk_id_whitelist = $1;
`;


// SQL for favorites management

export const getFavorites = (filterClauses, lang, limitClause, offsetClause) => `
SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_sid = ks.fk_sid AND ks.fk_kid = kid AND sl.lang = ${lang.main}),
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_sid = ks.fk_sid AND ks.fk_kid = kid AND sl.lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie AS serie_orig,
  ak.serie_altname AS serie_altname,
  ak.serie_i18n AS serie_i18n,
  ak.sid AS sid,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.duration AS duration,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  FROM all_karas AS ak
  INNER JOIN favorites AS f ON f.fk_kid = ak.kid
  WHERE fk_login = :username
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.languages_sortable, ak.serie IS NULL, lower(unaccent(serie)), ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(singers_sortable)), lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const removeFavorites = `
DELETE FROM favorites
WHERE fk_kid = $1
  AND fk_login = $2;
`;

export const insertFavorites = `
INSERT INTO favorites(fk_kid, fk_login)
VALUES ($1, $2) ON CONFLICT DO NOTHING
`;

export const emptyFavorites = `
DELETE FROM favorites WHERE fk_login = $1;
`;
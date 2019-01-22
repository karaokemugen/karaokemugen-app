// SQL for whitelist management

export const emptyWhitelist = 'DELETE FROM whitelist;';

export const addKaraToWhitelist = `
INSERT INTO whitelist(
	fk_kid,
	created_at,
	reason
)
	$1,
	$2,
	$3
`;

export const getWhitelistContents = (filterClauses, lang, limitClause, offsetClause) => `
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
  ak.seriefiles AS seriefiles,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  wl.created_at AS whitelisted_at,
  wl.reason AS reason,
  wl.pk_id_whitelist AS whitelistcontent_id
  FROM all_karas AS ak
  INNER JOIN whitelist AS wl ON wl.fk_kid = ak.kid
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.languages_sortable, ak.serie IS NULL, lower(unaccent(serie)), ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(singers_sortable)), lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const removeKaraFromWhitelist = `
DELETE FROM whitelist
WHERE fk_kid = $1;
`;


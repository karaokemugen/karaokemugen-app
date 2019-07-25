// SQL for Blacklist management
import {LangClause} from '../../types/database';

export const emptyBlacklistCriterias = 'DELETE FROM blacklist_criteria;';

export const generateBlacklist = `
TRUNCATE blacklist;
INSERT INTO blacklist (fk_kid, created_at, reason)
	SELECT kt.fk_kid, now() ,'Blacklisted Tag : ' || t.name || ' (type ' || blc.type || ')'
	FROM blacklist_criteria AS blc
	INNER JOIN tag t ON t.types @> ARRAY[blc.type] AND blc.value = t.pk_tid::varchar
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE blc.type BETWEEN 1 and 999
		AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT kt.fk_kid, now() ,'Blacklisted Tag by name : ' || blc.value
	FROM blacklist_criteria blc
	INNER JOIN tag t ON unaccent(t.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE blc.type = 0
	AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Series by name : ' ||  blc.value
	FROM blacklist_criteria blc
	INNER JOIN serie_lang sl ON unaccent(sl.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_serie ks ON sl.fk_sid = ks.fk_sid
	INNER JOIN kara k ON ks.fk_kid = k.pk_kid
	WHERE blc.type = 1000
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song manually'
	FROM blacklist_criteria blc
	INNER JOIN kara k ON k.pk_kid = blc.value::uuid
	WHERE blc.type = 1001
	AND   blc.value::uuid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song longer than ' || blc.value || ' seconds'
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration >= blc.value::integer
	WHERE blc.type = 1002
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song shorter than ' || blc.value || ' seconds'
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration <= blc.value::integer
	WHERE blc.type = 1003
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Title by name : ' ||  blc.value
	FROM blacklist_criteria blc
	INNER JOIN kara k ON unaccent(k.title) LIKE ('%' || blc.value || '%')
	WHERE blc.type = 1004
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
ON CONFLICT DO NOTHING;
`;

export const getBlacklistCriterias = `
SELECT pk_id_blcriteria AS blcriteria_id,
	type,
	value
FROM blacklist_criteria;
`;

export const addBlacklistCriteria = `
INSERT INTO blacklist_criteria(
	value,
	type
)
VALUES ($1,$2);
`;

export const deleteBlacklistCriteria = `
DELETE FROM blacklist_criteria
WHERE pk_id_blcriteria = $1
`;

export const getBlacklistContents = (filterClauses: string[], lang: LangClause, limitClause: string, offsetClause: string) => `
SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT array_to_string (array_agg(name), ', ') FROM all_kara_serie_langs WHERE kid = ak.kid AND lang = ${lang.main}),
	  (SELECT array_to_string (array_agg(name), ', ') FROM all_kara_serie_langs WHERE kid = ak.kid AND lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie AS serie_orig,
  ak.serie_altname AS serie_altname,
  COALESCE(ak.singers, '[]'::jsonb) AS singers,
  COALESCE(ak.songtypes, '[]'::jsonb) AS songtypes,
  COALESCE(ak.creators, '[]'::jsonb) AS creators,
  COALESCE(ak.songwriters, '[]'::jsonb) AS songwriters,
  ak.year AS year,
  COALESCE(ak.languages, '[]'::jsonb) AS langs,
  COALESCE(ak.authors, '[]'::jsonb) AS authors,
  COALESCE(ak.misc, '[]'::jsonb) AS misc,
  COALESCE(ak.origins, '[]'::jsonb) AS origins,
  COALESCE(ak.platforms, '[]'::jsonb) AS platforms,
  COALESCE(ak.families, '[]'::jsonb) AS families,
  COALESCE(ak.genres, '[]'::jsonb) AS genres,
  ak.duration AS duration,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  bl.created_at AS blacklisted_at,
  bl.reason AS reason
  FROM all_karas AS ak
  INNER JOIN blacklist AS bl ON bl.fk_kid = ak.kid
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.languages_sortable, ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

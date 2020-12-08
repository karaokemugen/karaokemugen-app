// SQL for Blacklist management

export const sqlemptyBlacklist = 'TRUNCATE blacklist';

export const sqlemptyBlacklistCriterias = 'DELETE FROM blacklist_criteria WHERE fk_id_blc_set = $1;';

export const sqlselectCurrentBLCSet = `
SELECT
	pk_id_blc_set AS blc_set_id,
	name,
	created_at,
	modified_at
FROM blacklist_criteria_set
WHERE flag_current = TRUE;
`;
export const sqlcopyBLCSet = `
INSERT INTO blacklist_criteria(value, type, fk_id_blc_set)
SELECT value, type, $2 FROM blacklist_criteria WHERE fk_id_blc_set = $1
`;

export const sqldeleteSet = `
DELETE FROM blacklist_criteria_set
WHERE pk_id_blc_set = $1;
`;

export const sqleditSet = `
UPDATE blacklist_criteria_set SET
	name = :name,
	modified_at = :modified_at,
	flag_current = :flag_current
WHERE pk_id_blc_set = :blc_set_id;
`;

export const sqlcreateSet = `
INSERT INTO blacklist_criteria_set(
	name,
	created_at,
	modified_at,
	flag_current
)
VALUES(
	:name,
	:created_at,
	:modified_at,
	:flag_current
) RETURNING pk_id_blc_set
`;


export const sqlunsetCurrentSet = `
UPDATE blacklist_criteria_set SET flag_current = FALSE WHERE flag_current = TRUE
`;

export const sqlselectSet = `
SELECT pk_id_blc_set AS blc_set_id,
	name,
	created_at,
	modified_at,
	flag_current
FROM blacklist_criteria_set
WHERE pk_id_blc_set = $1
`;

export const sqlselectSets = `
SELECT pk_id_blc_set AS blc_set_id,
	name,
	created_at,
	modified_at,
	flag_current
FROM blacklist_criteria_set
`;

export const sqlgenerateBlacklist = `
INSERT INTO blacklist (fk_kid, created_at, reason, fk_id_blcriteria)
	SELECT kt.fk_kid, now() ,'Blacklisted Tag : ' || t.name || ' (type ' || blc.type || ')', blc.pk_id_blcriteria
	FROM blacklist_criteria AS blc
	INNER JOIN tag t ON t.types @> ARRAY[blc.type] AND blc.value = t.pk_tid::varchar
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid AND kt.type = blc.type
	WHERE blc.type BETWEEN 1 and 999
		AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
		AND   fk_id_blc_set = $1
UNION
	SELECT kt.fk_kid, now() ,'Blacklisted Tag by name : ' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN tag t ON unaccent(t.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE blc.type = 0
	AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song manually', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k ON k.pk_kid = blc.value::uuid
	WHERE blc.type = 1001
	AND   blc.value::uuid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song longer than ' || blc.value || ' seconds', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration >= blc.value::integer
	WHERE blc.type = 1002
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song shorter than ' || blc.value || ' seconds', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration <= blc.value::integer
	WHERE blc.type = 1003
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Title by name : ' ||  blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k ON unaccent(k.title) LIKE ('%' || blc.value || '%')
	WHERE blc.type = 1004
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
ON CONFLICT DO NOTHING;
`;

export const sqlgetBlacklistCriterias = `
SELECT pk_id_blcriteria AS blcriteria_id,
	type,
	value
FROM blacklist_criteria
WHERE fk_id_blc_set = $1
`;

export const sqladdBlacklistCriteria = `
INSERT INTO blacklist_criteria(
	value,
	type,
	fk_id_blc_set
)
VALUES ($1,$2,$3);
`;

export const sqldeleteBlacklistCriteria = `
DELETE FROM blacklist_criteria
WHERE pk_id_blcriteria = $1
`;

export const sqlgetBlacklistContents = (filterClauses: string[], limitClause: string, offsetClause: string) => `
SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
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
  COALESCE(ak.series, '[]'::jsonb) AS series,
  ak.duration AS duration,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  bl.created_at AS blacklisted_at,
  bl.reason AS reason,
  bl.fk_id_blcriteria AS blc_id,
  blc.type AS blc_type,
  count(fk_kid) OVER()::integer AS count
  FROM all_karas AS ak
  INNER JOIN blacklist AS bl ON bl.fk_kid = ak.kid
  LEFT JOIN blacklist_criteria AS blc ON blc.pk_id_blcriteria = bl.fk_id_blcriteria
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;
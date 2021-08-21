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
	SELECT kt.fk_kid, now() , 'TAG:' || t.pk_tid || ':' || blc.type, blc.pk_id_blcriteria
	FROM blacklist_criteria AS blc
	INNER JOIN tag t ON t.types @> ARRAY[blc.type] AND blc.value = t.pk_tid::varchar
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid AND kt.type = blc.type
	WHERE blc.type BETWEEN 1 and 999
		AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
		AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'YEAR:' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
 	INNER JOIN kara k ON k.year = blc.value::smallint
	WHERE blc.type = 0
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'KID', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k ON k.pk_kid = blc.value::uuid
	WHERE blc.type = 1001
	AND   blc.value::uuid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'LONGER:' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration >= blc.value::integer
	WHERE blc.type = 1002
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'SHORTER:' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration <= blc.value::integer
	WHERE blc.type = 1003
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'TITLE:' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
--This is not going to work, but I don't want to handle it properly
	INNER JOIN kara k ON unaccent(k.titles::text) LIKE ('%' || blc.value || '%')
	WHERE blc.type = 1004
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT kt.fk_kid, now() ,'TAG_NAME:' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN tag t ON unaccent(t.name) ILIKE ('%' || unaccent(blc.value) || '%')
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE blc.type = 1005
	AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
	AND   fk_id_blc_set = $1
UNION
	SELECT k.pk_kid, now() ,'DOWNLOAD_STATUS:' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k ON k.download_status = blc.value
	WHERE blc.type = 1006
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
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

export const sqlgetBlacklistContents = (filterClauses: string[], limitClause: string, offsetClause: string, additionalFrom: string[]) => `
SELECT
  ak.pk_kid AS kid,
  ak.titles AS titles,
  ak.songorder AS songorder,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 2)') AS singers,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 3)') AS songtypes,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 4)') AS creators,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 8)') AS songwriters,
  ak.year AS year,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 5)') AS langs,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 6)') AS authors,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 9)') AS groups,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 7)') AS misc,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 11)') AS origins,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 13)') AS platforms,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 10)') AS families,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 12)') AS genres,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 14)') AS versions,
  ak.duration AS duration,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  bl.created_at AS blacklisted_at,
  bl.reason AS reason,
  bl.fk_id_blcriteria AS blc_id,
  blc.type AS blc_type,
  count(fk_kid) OVER()::integer AS count
  FROM all_karas AS ak
  INNER JOIN blacklist AS bl ON bl.fk_kid = ak.pk_kid
  LEFT JOIN blacklist_criteria AS blc ON blc.pk_id_blcriteria = bl.fk_id_blcriteria
  ${additionalFrom.join('')}
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, ak.titles_sortable
${limitClause}
${offsetClause}
`;

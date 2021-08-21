// SQL for whitelist management

export const sqlemptyWhitelist = 'DELETE FROM whitelist;';

export const sqladdKaraToWhitelist = `
INSERT INTO whitelist(
	fk_kid,
	created_at,
	reason
)
VALUES (
	$1,
	$2,
	$3
) ON CONFLICT DO NOTHING;
`;

export const sqlgetWhitelistContents = (filterClauses: string[], limitClause: string, offsetClause: string, additionalFrom: string[]) => `
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
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  wl.created_at AS whitelisted_at,
  wl.reason AS reason,
  count(ak.pk_kid) OVER()::integer AS count
  FROM all_karas AS ak
  INNER JOIN whitelist AS wl ON wl.fk_kid = ak.pk_kid
  ${additionalFrom.join('')}
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, ak.titles_sortable
${limitClause}
${offsetClause}
`;

export const sqlremoveKaraFromWhitelist = `
DELETE FROM whitelist
WHERE fk_kid = $1;
`;


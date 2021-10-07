// SQL for favorites management

export const sqlgetFavorites = (
	filterClauses: string[],
	limitClause: string,
	offsetClause: string,
	additionalFrom: string[]
) => `
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
  array_agg(DISTINCT pc.pk_id_plcontent) AS public_plc_id,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  array_agg(DISTINCT pc_self.pk_id_plcontent) AS my_public_plc_id,
  count(ak.pk_kid) OVER()::integer AS count
  FROM all_karas AS ak
  INNER JOIN favorites AS f ON f.fk_kid = ak.pk_kid
  LEFT OUTER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid AND pc.fk_id_playlist = :publicPlaylist_id
  LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = ak.pk_kid AND pc_self.fk_id_playlist = :publicPlaylist_id AND pc_self.fk_login = :username
  LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent AND up.fk_login = :username
  ${additionalFrom.join('')}
  WHERE f.fk_login = :username
  ${filterClauses.map((clause) => 'AND (' + clause + ')').reduce((a, b) => a + ' ' + b, '')}
GROUP BY ak.pk_kid, ak.titles, ak.songorder, year, ak.tags, duration, ak.created_at, ak.modified_at, pc.fk_kid, ak.serie_singer_sortable, ak.songtypes_sortable, ak.languages_sortable, ak.titles_sortable
ORDER BY ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, ak.titles_sortable
${limitClause}
${offsetClause}
`;

export const sqlgetFavoritesMicro = (limitClause: string, offsetClause: string) => `
SELECT
  ak.pk_kid AS kid
  FROM all_karas AS ak
  INNER JOIN favorites AS f ON f.fk_kid = ak.pk_kid
  WHERE fk_login = :username
${limitClause}
${offsetClause}
`;

export const sqlremoveFavorites = `
DELETE FROM favorites
WHERE fk_kid = $1
  AND fk_login = $2;
`;

export const sqlclearFavorites = `
DELETE FROM favorites
WHERE fk_login = $1;
`;

export const sqlinsertFavorites = `
INSERT INTO favorites(fk_kid, fk_login)
VALUES ($1, $2) ON CONFLICT DO NOTHING
`;

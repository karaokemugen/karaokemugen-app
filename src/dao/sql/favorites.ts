// SQL for favorites management

export const sqlgetFavorites = (filterClauses: string[], limitClause: string, offsetClause: string, additionalFrom: string[]) => `
SELECT
  ak.pk_kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(ak.series, '[]'::jsonb) AS series,
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
  COALESCE(ak.versions, '[]'::jsonb) AS versions,
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
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
GROUP BY ak.pk_kid, ak.title, ak.songorder, series, singers, songtypes, creators, songwriters, year, langs, authors, groups, misc, origins, platforms, families, genres, versions, duration, ak.created_at, ak.modified_at, pc.fk_kid, ak.serie_singer_sortable, ak.songtypes_sortable, ak.languages_sortable
ORDER BY ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, lower(unaccent(ak.title))
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

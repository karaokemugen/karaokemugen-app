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

export const sqlgetWhitelistContents = (filterClauses: string[], limitClause: string, offsetClause: string) => `
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
  COALESCE(ak.groups, '[]'::jsonb) AS groups,
  COALESCE(ak.misc, '[]'::jsonb) AS misc,
  COALESCE(ak.origins, '[]'::jsonb) AS origins,
  COALESCE(ak.platforms, '[]'::jsonb) AS platforms,
  COALESCE(ak.families, '[]'::jsonb) AS families,
  COALESCE(ak.genres, '[]'::jsonb) AS genres,
  COALESCE(ak.versions, '[]'::jsonb) AS versions,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  wl.created_at AS whitelisted_at,
  wl.reason AS reason,
  count(ak.pk_kid) OVER()::integer AS count
  FROM all_karas AS ak
  INNER JOIN whitelist AS wl ON wl.fk_kid = ak.pk_kid
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const sqlremoveKaraFromWhitelist = `
DELETE FROM whitelist
WHERE fk_kid = $1;
`;


// SQL for kara management

export const sqladdViewcount = `
INSERT INTO played(
	fk_kid,
	played_at,
	fk_seid
)
VALUES(
	:kid,
	:played_at,
	:seid
) ON CONFLICT DO NOTHING;
`;

export const sqladdRequested = `
INSERT INTO requested(
	fk_login,
	fk_kid,
	requested_at,
	fk_seid
)
VALUES(
	$1,
	$2,
	$3,
	$4
) ON CONFLICT DO NOTHING;
`;

export const sqlgetAllKaras = (
	filterClauses: string[],
	filterType: 'AND' | 'OR',
	whereClauses: string,
	groupClauses: string,
	orderClauses: string,
	havingClause: string,
	limitClause: string,
	offsetClause: string,
	additionalFrom: string[],
	selectRequested: string,
	groupClauseEnd: string,
	joinClauses: string[],
	collectionClauses: string[],
	withCTE: string[],
	blacklistClauses: string
) => `
WITH ${withCTE.join(', \n')}
SELECT
  ak.tags AS tags,
  ak.pk_kid AS kid,
  ak.titles AS titles,
  ak.titles_aliases AS titles_aliases,
  ak.titles_default_language AS titles_default_language,
  ak.songorder AS songorder,
  ak.lyrics_infos AS lyrics_infos,
  ak.year AS year,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.loudnorm AS loudnorm,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize,
  ak.download_status AS download_status,
  ak.comment AS comment,
  ak.ignore_hooks AS ignore_hooks,
  ak.from_display_type AS from_display_type,
  ak.songname,
  COUNT(p.*)::integer AS played,
  ${selectRequested}
  (CASE WHEN :dejavu_time < MAX(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  NOW() - MAX(p.played_at) AS lastplayed_ago,
  (CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  ak.repository as repository,
  ak.tid AS tid,
  array_remove(array_agg(DISTINCT pc.pk_plcid), null) AS public_plc_id,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  array_remove(array_agg(DISTINCT pc_self.pk_plcid), null) AS my_public_plc_id,
  count(ak.pk_kid) OVER()::integer AS count,
  array_remove(array_agg(DISTINCT krc.fk_kid_parent), null) AS parents,
  array_remove(array_agg(DISTINCT krp.fk_kid_child), null) AS children,
  array_remove((SELECT array_agg(DISTINCT fk_kid_child) FROM kara_relation
  WHERE fk_kid_parent = ANY (array_remove(array_agg(DISTINCT krc.fk_kid_parent), null))), ak.pk_kid) AS siblings,
  (SELECT COUNT(up.fk_plcid)::integer
  FROM upvote up
  LEFT JOIN playlist_content pc_pub ON pc_pub.fk_plaid = :publicPlaylist_id AND up.fk_plcid = pc_pub.pk_plcid
  WHERE ak.pk_kid = pc_pub.fk_kid
  ) AS upvotes
FROM all_karas AS ak
LEFT OUTER JOIN kara k ON k.pk_kid = ak.pk_kid
LEFT OUTER JOIN kara_relation krp ON krp.fk_kid_parent = ak.pk_kid ${
	blacklistClauses ? ' AND krp.fk_kid_child NOT IN (SELECT * FROM blacklist)' : ''
}
LEFT OUTER JOIN kara_relation krc ON krc.fk_kid_child = ak.pk_kid ${
	blacklistClauses ? ' AND krc.fk_kid_parent NOT IN (SELECT * FROM blacklist)' : ''
}
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.pk_kid
	LEFT OUTER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid AND pc.fk_plaid = :publicPlaylist_id
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = ak.pk_kid AND pc_self.fk_plaid = :publicPlaylist_id AND pc_self.fk_login = :username
LEFT OUTER JOIN upvote up ON up.fk_plcid = pc.pk_plcid AND up.fk_login = :username
LEFT OUTER JOIN favorites AS f ON f.fk_login = :username AND f.fk_kid = ak.pk_kid
${joinClauses.join('')}
${additionalFrom.join('')}
WHERE true
${
	collectionClauses.length > 0
		? `AND ((${collectionClauses
				.map(clause => `(${clause})`)
				.join(
					' OR '
				)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
		: ''
}
${filterClauses.map(clause => `${filterType} (${clause})`).reduce((a, b) => `${a} ${b}`, '')}
${whereClauses}
${blacklistClauses}
GROUP BY ${groupClauses}
	ak.pk_kid,
	pc.fk_kid,
	ak.titles,
	ak.titles_aliases,
	ak.titles_default_language,
	ak.comment,
	ak.songorder,
	ak.serie_singergroup_singer_sortable,
	ak.lyrics_infos,
	ak.year,
	ak.tags,
	ak.mediafile,
	ak.karafile,
	ak.duration,
	ak.loudnorm,
	ak.created_at,
	ak.modified_at,
	ak.mediasize,
	ak.repository,
	ak.songtypes_sortable,
	ak.songname,
	f.fk_kid,
	ak.tid,
	ak.languages_sortable,
	ak.download_status,
	ak.ignore_hooks,
	ak.titles_sortable,
	ak.from_display_type
	${groupClauseEnd}
${havingClause}
ORDER BY ${orderClauses}
	ak.songtypes_sortable DESC,
	ak.songorder,
	ak.languages_sortable,
	parents,
	ak.titles_sortable
${limitClause}
${offsetClause}
`;

export const sqlgetAllKarasMicro = (
	filterClauses: string[],
	additionalFrom: string[],
	collectionClauses: string[]
) => `SELECT
  ak.pk_kid AS kid,
  ak.duration AS duration,
  ak.mediafile AS mediafile,
  ak.mediasize AS mediasize,
  ak.repository AS repository,
  ak.lyrics_infos AS lyrics_infos,
  ak.karafile AS karafile,
  ak.from_display_type AS from_display_type,
  ak.download_status AS download_status,
  ak.songname AS songname
FROM all_karas AS ak
${additionalFrom.join('')}
WHERE true
${
	collectionClauses.length > 0
		? `AND ((${collectionClauses
				.map(clause => `(${clause})`)
				.join(
					' OR '
				)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
		: ''
}
  ${filterClauses.map(clause => `AND (${clause})`).reduce((a, b) => `${a} ${b}`, '')}
`;

export const sqldeleteKara = `
DELETE FROM kara WHERE pk_kid = ANY ($1);
`;

export const sqlinsertKara = `
INSERT INTO kara(
	titles,
	titles_aliases,
	titles_default_language,
	year,
	songorder,
	mediafile,
	duration,
	loudnorm,
	modified_at,
	created_at,
	karafile,
	pk_kid,
	repository,
	mediasize,
	download_status,
	comment,
	from_display_type,
	ignore_hooks,
	songname,
	lyrics_infos
)
VALUES(
	:titles,
	:titles_aliases,
	:titles_default_language,
	:year,
	:songorder,
	:mediafile,
	:duration,
	:loudnorm,
	:modified_at,
	:created_at,
	:karafile,
	:kid,
	:repository,
	:mediasize,
	:download_status,
	:comment,
	:from_display_type,
	:ignoreHooks,
	:songname,
	:lyrics_infos
)
ON CONFLICT (pk_kid) DO
UPDATE SET
 titles = :titles,
 titles_aliases = :titles_aliases,
 titles_default_language = :titles_default_language,
 year = :year,
 songorder = :songorder,
 mediafile = :mediafile,
 duration = :duration,
 loudnorm = :loudnorm,
 modified_at = :modified_at,
 created_at = :created_at,
 karafile = :karafile,
 pk_kid = :kid,
 repository = :repository,
 mediasize = :mediasize,
 download_status = :download_status,
 comment = :comment,
 from_display_type = :from_display_type,
 ignore_hooks = :ignoreHooks,
 songname = :songname,
 lyrics_infos = :lyrics_infos
RETURNING
 (SELECT k2.karafile FROM kara k2 WHERE k2.pk_kid = kara.pk_kid) AS old_karafile,
 (SELECT k2.lyrics_infos FROM kara k2 WHERE k2.pk_kid = kara.pk_kid) AS old_lyrics_infos,
 (SELECT k2.mediafile FROM kara k2 WHERE k2.pk_kid = kara.pk_kid) AS old_mediafile,
 (SELECT k2.modified_at FROM kara k2 WHERE k2.pk_kid = kara.pk_kid) AS old_modified_at,
 (SELECT k2.repository FROM kara k2 WHERE k2.pk_kid = kara.pk_kid) AS old_repository,
 (SELECT k2.download_status FROM kara k2 WHERE k2.pk_kid = kara.pk_kid) AS old_download_status,
 (SELECT array_remove(array_agg(DISTINCT kr.fk_kid_parent), null) FROM kara_relation kr, kara k2 WHERE kr.fk_kid_child = k2.pk_kid) AS old_parents,
 (SELECT array_remove(array_agg(DISTINCT kr.fk_kid_parent), null) FROM kara_relation kr WHERE kr.fk_kid_child = kara.pk_kid) AS parents,
 karafile, lyrics_infos, mediafile, modified_at, repository, download_status
;
`;

export const sqlgetYears = (collectionClauses: string[]) => `
SELECT DISTINCT
	k.year,
	COUNT(k2.pk_kid)::integer AS karacount
FROM kara AS k
LEFT JOIN kara k2 ON k2.pk_kid = k.pk_kid
LEFT JOIN all_karas ak ON k2.pk_kid = ak.pk_kid
WHERE true
${
	collectionClauses.length > 0
		? `AND ((${collectionClauses
				.map(clause => `(${clause})`)
				.join(
					' OR '
				)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
		: ''
}
GROUP BY k.year
ORDER BY year;
`;

export const sqlselectAllKIDs = (kid?: string) => `
SELECT pk_kid AS kid
FROM kara
${kid ? `WHERE pk_kid = '${kid}'` : ''}
`;

export const sqlTruncateOnlineRequested = 'TRUNCATE online_requested';

export const sqldeleteChildrenKara = 'DELETE FROM kara_relation WHERE fk_kid_child = $1';

export const sqlinsertChildrenParentKara = `
INSERT INTO kara_relation(
	fk_kid_parent,
	fk_kid_child
)
VALUES(
	:parent_kid,
	:child_kid
);
`;

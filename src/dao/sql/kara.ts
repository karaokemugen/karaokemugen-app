// SQL for kara management

export const sqladdKaraToPlaylist = `
INSERT INTO playlist_content(
	fk_id_playlist,
	fk_login,
	nickname,
	fk_kid,
	created_at,
	pos,
	flag_free,
	flag_visible
) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7,
	$8
) RETURNING pk_id_plcontent AS plc_id, fk_kid AS kid, pos, fk_login AS username
`;

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

export const sqlgetAllKaras = (filterClauses: string[], typeClauses: string, groupClauses: string, orderClauses: string, havingClause: string, limitClause: string, offsetClause: string) => `SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  ak.subfile AS subfile,
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
  COALESCE(ak.series, '[]'::jsonb) AS series,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize,
  ak.subchecksum AS subchecksum,
  COUNT(p.*)::integer AS played,
  COUNT(rq.*)::integer AS requested,
  (CASE WHEN :dejavu_time < MAX(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  NOW() - MAX(p.played_at) AS lastplayed_ago,
  MAX(rq.requested_at) AS lastrequested_at,
  (CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  ak.repository as repository,
  ak.tid AS tid,
  (CASE WHEN pc.fk_kid IS NULL
	THEN FALSE
	ELSE TRUE
  END) as flag_inplaylist,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  array_agg(DISTINCT pc_self.pk_id_plcontent) AS my_public_plc_id,
  count(ak.kid) OVER()::integer AS count
FROM all_karas AS ak
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.kid
LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.kid
LEFT OUTER JOIN playlist_content AS pc ON pc.fk_kid = ak.kid AND pc.fk_id_playlist = :publicPlaylist_id
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = ak.kid AND pc_self.fk_id_playlist = :publicPlaylist_id AND pc_self.fk_login = :username
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent
LEFT OUTER JOIN favorites AS f ON f.fk_login = :username AND f.fk_kid = ak.kid
WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
GROUP BY ${groupClauses} ak.kid, pc.fk_kid, ak.title, ak.songorder, ak.serie_singer_sortable, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.authors, ak.misc, ak.genres, ak.families, ak.platforms, ak.origins, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.created_at, ak.modified_at, ak.mediasize, ak.groups, ak.series, ak.repository, ak.songtypes_sortable, f.fk_kid, ak.tid, ak.languages_sortable, ak.subchecksum
${havingClause}
ORDER BY ${orderClauses} ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, ak.title
${limitClause}
${offsetClause}
`;

export const sqlgetKaraMini = `
SELECT
	ak.kid AS kid,
	ak.title AS title,
	ak.mediafile AS mediafile,
	ak.karafile AS karafile,
	ak.subfile AS subfile,
	ak.duration AS duration,
	ak.repository as repository
FROM all_karas AS ak
WHERE ak.kid = $1
`;

export const sqlgetKaraHistory = `
SELECT ak.title AS title,
	ak.songorder AS songorder,
	ak.series AS series,
	ak.singers AS singers,
	ak.songtypes AS songtypes,
    ak.languages AS langs,
    (SELECT COUNT(fk_kid) AS played FROM played WHERE fk_kid = ak.kid)::integer AS played,
    p.played_at AS played_at
FROM all_karas AS ak
INNER JOIN played p ON p.fk_kid = ak.kid
ORDER BY p.played_at DESC
`;

export const sqldeleteKara = `
DELETE FROM kara WHERE pk_kid = $1;
`;

export const sqlremoveKaraFromPlaylist = `
DELETE FROM playlist_content
WHERE pk_id_plcontent IN ($playlistcontent_id)
	AND fk_id_playlist = $1;
`;

export const sqlgetSongCountPerUser = `
SELECT COUNT(1)::integer AS count
FROM playlist_content AS pc
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;

export const sqlgetTimeSpentPerUser = `
SELECT COALESCE(SUM(k.duration),0)::integer AS time_spent
FROM kara AS k
INNER JOIN playlist_content AS pc ON pc.fk_kid = k.pk_kid
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;

export const sqlupdateFreeOrphanedSongs = `
UPDATE playlist_content SET
	flag_free = TRUE
WHERE created_at <= $1;
`;

export const sqlupdateKara = `
UPDATE kara SET
	title = :title,
	year = :year,
	songorder = :songorder,
	mediafile = :mediafile,
	subchecksum = :subchecksum,
	mediasize = :mediasize,
	subfile = :subfile,
	duration = :duration,
	gain = :gain,
	modified_at = :modified_at,
	karafile = :karafile
WHERE pk_kid = :kid
`;

export const sqlinsertKara = `
INSERT INTO kara(
	title,
	year,
	songorder,
	mediafile,
	subfile,
	duration,
	gain,
	modified_at,
	created_at,
	subchecksum,
	karafile,
	pk_kid,
	repository,
	mediasize
)
VALUES(
	:title,
	:year,
	:songorder,
	:mediafile,
	:subfile,
	:duration,
	:gain,
	:modified_at,
	:created_at,
	:subchecksum,
	:karafile,
	:kid,
	:repository,
	:mediasize
);
`;

export const sqlgetYears = 'SELECT year, karacount::integer FROM all_years ORDER BY year';

export const sqlselectAllKIDs = `
SELECT ak.kid
FROM all_karas ak;
`;

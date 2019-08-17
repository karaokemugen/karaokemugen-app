// SQL for kara management
import {LangClause} from '../../lib/types/database';

export const addKaraToPlaylist = (values:string) => `
INSERT INTO playlist_content(
	fk_id_playlist,
	fk_login,
	nickname,
	fk_kid,
	created_at,
	pos,
	flag_playing,
	flag_free,
	flag_visible
) VALUES ${values};
`;

export const addViewcount = `
INSERT INTO played(
	fk_kid,
	played_at,
	fk_seid
)
VALUES(
	:kid,
	:played_at,
	:seid
)
`;

export const addRequested = `
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
)
`;

export const getAllKaras = (filterClauses: string[], lang: LangClause, typeClauses: string, orderClauses: string, havingClause: string, limitClause: string, offsetClause: string) => `SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT array_to_string (array_agg(name), ', ') FROM all_kara_serie_langs WHERE kid = ak.kid AND lang = ${lang.main}),
	  (SELECT array_to_string (array_agg(name), ', ') FROM all_kara_serie_langs WHERE kid = ak.kid AND lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie AS serie_orig,
  ak.serie_altname AS serie_altname,
  ak.seriefiles AS seriefiles,
  ak.sid AS sid,
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
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize,
  COUNT(p.*)::integer AS played,
  COUNT(rq.*)::integer AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  NOW() - MAX(p.played_at) AS lastplayed_ago,
  (CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  ak.repo AS repo,
  ak.tag_names AS tag_names,
  ak.tid AS tid
FROM all_karas AS ak
LEFT OUTER JOIN kara_serie AS ks_main ON ks_main.fk_kid = ak.kid
LEFT OUTER JOIN serie_lang AS sl_main ON sl_main.fk_sid = ks_main.fk_sid AND sl_main.lang = ${lang.main}
LEFT OUTER JOIN kara_serie AS ks_fall ON ks_fall.fk_sid = ak.kid
LEFT OUTER JOIN serie_lang AS sl_fall ON sl_fall.fk_sid = ks_fall.fk_sid AND sl_fall.lang = ${lang.fallback}
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.kid
LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.kid
LEFT OUTER JOIN favorites AS f ON f.fk_login = :username AND f.fk_kid = ak.kid
WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
GROUP BY ak.kid, ak.title, ak.songorder, ak.serie, ak.serie_singer_sortable, ak.sid, ak.serie_altname,  ak.seriefiles, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.groups, ak.authors, ak.misc, ak.genres, ak.families, ak.platforms, ak.origins, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.created_at, ak.modified_at, ak.mediasize, ak.groups, ak.repo, ak.languages_sortable, ak.songtypes_sortable, ak.singers_sortable, f.fk_kid, ak.tag_names, ak.tid
${havingClause}
ORDER BY ${orderClauses} ak.languages_sortable, ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const getKaraMini = `
SELECT
	ak.kid AS kid,
	ak.title AS title,
	ak.mediafile AS mediafile,
	ak.karafile AS karafile,
	ak.subfile AS subfile,
	ak.duration AS duration,
	ak.sid AS sid
FROM all_karas AS ak
WHERE ak.kid = $1
`;

export const getKaraHistory = `
SELECT ak.title AS title,
	ak.songorder AS songorder,
	ak.serie AS serie,
	ak.singers AS singers,
	ak.songtypes AS songtypes,
    ak.languages AS langs,
    (SELECT COUNT(fk_kid) AS played FROM played WHERE fk_kid = ak.kid)::integer AS played,
    p.played_at AS played_at
FROM all_karas AS ak
INNER JOIN played p ON p.fk_kid = ak.kid
ORDER BY p.played_at DESC
`;

export const deleteKara = `
DELETE FROM kara WHERE pk_kid = $1;
`;

export const removeKaraFromPlaylist = `
DELETE FROM playlist_content
WHERE pk_id_plcontent IN ($playlistcontent_id)
	AND fk_id_playlist = $1;
`;

export const getSongCountPerUser = `
SELECT COUNT(1)::integer AS count
FROM playlist_content AS pc
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;

export const getTimeSpentPerUser = `
SELECT COALESCE(SUM(k.duration),0)::integer AS time_spent
FROM kara AS k
INNER JOIN playlist_content AS pc ON pc.fk_kid = k.pk_kid
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;


export const resetViewcounts = 'TRUNCATE played RESTART IDENTITY;';

export const updateFreeOrphanedSongs = `
UPDATE playlist_content SET
	flag_free = TRUE
WHERE created_at <= $1;
`;

export const updateKara = `
UPDATE kara SET
	title = :title,
	year = :year,
	songorder = :songorder,
	mediafile = :mediafile,
	subfile = :subfile,
	duration = :duration,
	gain = :gain,
	modified_at = :modified_at,
	karafile = :karafile
WHERE pk_kid = :kid
`;

export const insertKara = `
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
	karafile,
	pk_kid,
	fk_repo_name
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
	:karafile,
	:kid,
	:repo
);
`;

export const getYears = 'SELECT year, karacount FROM all_years ORDER BY year';

export const selectAllKIDs = `
SELECT ak.kid
FROM all_karas ak;
`;
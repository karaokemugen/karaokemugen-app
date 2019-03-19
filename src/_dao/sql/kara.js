// SQL for kara management

export const addKaraToPlaylist = values => `
INSERT INTO playlist_content(
	fk_id_playlist,
	fk_login,
	nickname,
	fk_kid,
	created_at,
	pos,
	flag_playing,
	flag_free
) VALUES ${values};
`;

export const addViewcount = `
INSERT INTO played(
	fk_kid,
	played_at,
	session_started_at
)
VALUES(
	:kid,
	:played_at,
	:started_at
)
`;

export const addRequested = `
INSERT INTO requested(
	fk_login,
	fk_kid,
	requested_at,
	session_started_at
)
VALUES(
	$1,
	$2,
	$3,
	$4
)
`;

export const getAllKaras = (filterClauses, lang, typeClauses, orderClauses, havingClause, limitClause, offsetClause) => `SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT name FROM all_kara_serie_langs WHERE kid = ak.kid AND lang = ${lang.main}),
	  (SELECT name FROM all_kara_serie_langs WHERE kid = ak.kid AND lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie AS serie_orig,
  ak.serie_altname AS serie_altname,
  ak.seriefiles AS seriefiles,
  ak.sid AS sid,
  ak.subfile AS subfile,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize,
  ak.groups AS groups,
  COUNT(p.*)::integer AS played,
  COUNT(rq.*)::integer AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  (CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  ak.repo AS repo
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
GROUP BY ak.kid, ak.title, ak.songorder, ak.serie, ak.sid, ak.serie_altname,  ak.seriefiles, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.authors, ak.misc_tags, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.created_at, ak.modified_at, ak.mediasize, ak.groups, ak.repo, ak.languages_sortable, ak.songtypes_sortable, ak.singers_sortable, f.fk_kid
${havingClause}
ORDER BY ${orderClauses} ak.languages_sortable, ak.serie IS NULL, lower(unaccent(serie)), ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(singers_sortable)), lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const getKaraMini = `
SELECT ak.title AS title,
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
    ak.languages AS languages,
    (SELECT COUNT(fk_kid) AS played FROM played WHERE fk_kid = ak.kid) AS played,
    p.played_at AS played_at
FROM all_karas AS ak
INNER JOIN played p ON p.fk_kid = ak.kid
ORDER BY p.played_at DESC
`;

export const deleteKara = `
DELETE FROM kara WHERE pk_kid = $1;
DELETE FROM kara_tag WHERE fk_kid = $1;
DELETE FROM kara_serie WHERE fk_kid = $1;
`;

export const removeKaraFromPlaylist = `
DELETE FROM playlist_content
WHERE pk_id_plcontent IN ($playlistcontent_id)
	AND fk_id_playlist = $1;
`;

export const getSongCountPerUser = `
SELECT COUNT(1) AS count
FROM playlist_content AS pc
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;

export const getTimeSpentPerUser = `
SELECT SUM(k.duration) AS timeSpent
FROM karas AS k
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

export const getRandomKara = `
SELECT ak.kid
FROM all_karas ak
WHERE ak.kid NOT IN (
	SELECT pc.fk_kid
	FROM playlist_content pc
	WHERE pc.fk_id_playlist = $1
)
ORDER BY RANDOM() LIMIT 1;
`;

export const selectAllKIDs = `
SELECT ak.kid
FROM all_karas ak;
`;
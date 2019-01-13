// SQL for kara management

export const addKaraToPlaylist = `
INSERT INTO playlist_content(
	fk_id_playlist,
	fk_id_kara,
	kid,
	created_at,
	fk_id_user,
	pos,
	flag_playing,
	flag_free,
	nickname
)
	SELECT
		$1,
		$4,
		k.kid,
		$5,
		u.pk_id_user,
		$6,
		FALSE,
		FALSE,
		$3
	FROM kara AS k,
	    users AS u
	WHERE pk_id_kara = $4
		AND u.login = $2;
`;

export const addViewcount = `
INSERT INTO played(
	fk_id_kara,
	kid,
	played_at,
	session_started_at
)
VALUES(
	:kara_id,
	:kid,
	:played_at,
	:started_at
)
`;

export const addRequested = `
INSERT INTO requested(
	fk_id_user,
	fk_id_kara,
	kid,
	requested_at,
	session_started_at
)
VALUES(
	$1,
	$2,
	(SELECT kid FROM all_karas WHERE kara_id = $2),
	$3,
	$4
)
`;

export const getAllKaras = (filterClauses, lang, typeClauses, orderClauses, limitClause, offsetClause) => `SELECT ak.kara_id AS kara_id,
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie_altname AS serie_altname,
  ak.serie_i18n AS serie_i18n,
  ak.serie_id AS serie_id,
  ak.seriefiles AS seriefiles,
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
  COUNT(p.pk_id_played) AS played,
  COUNT(rq.pk_id_requested) AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  (CASE WHEN cur_user_fav.fk_id_kara IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites
FROM all_karas AS ak
LEFT OUTER JOIN kara_serie AS ks_main ON ks_main.fk_id_kara = ak.kara_id
LEFT OUTER JOIN serie_lang AS sl_main ON sl_main.fk_id_serie = ks_main.fk_id_serie AND sl_main.lang = ${lang.main}
LEFT OUTER JOIN kara_serie AS ks_fall ON ks_fall.fk_id_kara = ak.kara_id
LEFT OUTER JOIN serie_lang AS sl_fall ON sl_fall.fk_id_serie = ks_fall.fk_id_serie AND sl_fall.lang = ${lang.fallback}
LEFT OUTER JOIN played AS p ON p.fk_id_kara = ak.kara_id
LEFT OUTER JOIN requested AS rq ON rq.fk_id_kara = ak.kara_id
LEFT OUTER JOIN users AS cur_user ON cur_user.login = :username
LEFT OUTER JOIN playlist AS cur_user_pl_fav ON cur_user.pk_id_user = cur_user_pl_fav.fk_id_user AND cur_user_pl_fav.flag_favorites = TRUE
LEFT OUTER JOIN playlist_content cur_user_fav ON cur_user_fav.fk_id_playlist = cur_user_pl_fav.fk_id_user AND cur_user_fav.fk_id_kara = ak.kara_id
WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
GROUP BY ak.kara_id, ak.kid, ak.title, ak.songorder, ak.serie, ak.serie_altname, ak.serie_i18n, ak.serie_id, ak.seriefiles, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.authors, ak.misc_tags, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.created_at, ak.modified_at, ak.mediasize, cur_user_fav.fk_id_kara, ak.languages_sortable, ak.songtypes_sortable, ak.singers_sortable
ORDER BY ${orderClauses} ak.languages_sortable, ak.serie IS NULL, lower(unaccent(serie)), ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(singers_sortable)), lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const getKaraMini = `
SELECT ak.title AS title,
	ak.subfile AS subfile,
	ak.duration AS duration
FROM all_karas AS ak
WHERE ak.kara_id = $1
`;

export const isKara = `
SELECT pk_id_kara
FROM kara
WHERE pk_id_kara = $1;
`;

export const isKaraInPlaylist = `
SELECT fk_id_kara
FROM playlist_content
WHERE fk_id_playlist = :playlist_id
AND fk_id_kara = :kara_id;
`;

export const removeKaraFromPlaylist = `
DELETE FROM playlist_content
WHERE pk_id_plcontent IN ($playlistcontent_id)
	AND fk_id_playlist = $1;
`;

export const getSongCountPerUser = `
SELECT COUNT(1) AS count
FROM playlist_content AS pc
WHERE pc.fk_id_user = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
	AND pc.fk_id_kara != 0
`;

export const getTimeSpentPerUser = `
SELECT SUM(ak.duration) AS timeSpent
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
WHERE pc.fk_id_user = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
	AND pc.fk_id_kara != 0
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
WHERE pk_id_kara = :kara_id
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
	kid
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
	:kid
) RETURNING *;
`;

export const getYears = 'SELECT DISTINCT year FROM all_karas ORDER BY year';
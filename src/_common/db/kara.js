// SQL for kara management

export const addKaraToPlaylist = `INSERT INTO playlist_content(
									fk_id_playlist,
									fk_id_kara,
									kid,
									created_at,
									fk_id_user,
									pos,
									flag_playing,
									flag_free,
									pseudo_add,
									NORM_pseudo_add)
								SELECT $playlist_id,$kara_id,k.kid,$created_at,u.pk_id_user,$pos,0,0,$pseudo_add,$NORM_pseudo_add
								FROM karasdb.kara AS k,
								     user AS u
								WHERE pk_id_kara = $kara_id
									AND u.login = $username;
								`;

export const addViewcount = `INSERT INTO viewcount(
								fk_id_kara,
								kid,
								modified_at)
							VALUES($kara_id,$kid,$modified_at);
							`;

export const addRequested = `INSERT INTO request(
								fk_id_user,
								fk_id_kara,
								kid,
								requested_at)
							VALUES($user_id,$kara_id,(SELECT kid FROM karasdb.all_karas WHERE kara_id = $kara_id),$requested_at);
							`;

export const getKaraHistory = `SELECT ak.title AS title,
								ak.songorder AS songorder,
      							ak.serie AS serie,
								ak.singer AS singer,
      							ak.songtype AS songtype,
      							ak.language AS language,
      							(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
      							vc.modified_at AS viewed_at
							FROM karasdb.all_karas AS ak
							INNER JOIN viewcount AS vc ON vc.fk_id_kara = ak.kara_id
 							ORDER BY vc.modified_at DESC
							`;

export const getKaraViewcounts = `SELECT ak.title AS title,
								ak.songorder AS songorder,
      							ak.serie AS serie,
								ak.singer AS singer,
      							ak.songtype AS songtype,
      							ak.language AS language,
      							(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount
							FROM karasdb.all_karas AS ak
							WHERE viewcount > 0
 							ORDER BY viewcount DESC
							`;


export const getAllKaras = (filterClauses, lang) => `SELECT ak.kara_id AS kara_id,
      							ak.kid AS kid,
      							ak.title AS title,
								ak.NORM_title AS NORM_title,
      							ak.songorder AS songorder,
      							COALESCE(
									  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
									  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
									  ak.serie) AS serie,
								COALESCE(
									  (SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
									  (SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
									  ak.NORM_serie) AS NORM_serie,
      							ak.serie_altname AS serie_altname,
      							ak.NORM_serie_altname AS NORM_serie_altname,
								ak.serie_i18n AS serie_i18n,
								ak.serie AS serie_orig,
      							ak.singer AS singer,
								ak.NORM_singer AS NORM_singer,
								ak.groups AS groups,
								ak.NORM_groups AS NORM_groups,
      							ak.songtype AS songtype,
      							ak.creator AS creator,
	  							ak.songwriter AS songwriter,
	  							ak.NORM_songwriter AS NORM_songwriter,
	  							ak.year AS year,
	  							ak.NORM_creator AS NORM_creator,
      							ak.language AS language,
      							ak.author AS author,
      							ak.NORM_author AS NORM_author,
      							ak.misc AS misc,
								(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
								(SELECT COUNT(pk_id_request) AS request FROM request WHERE fk_id_kara = ak.kara_id) AS requested,
								ak.mediafile AS mediafile,
								ak.karafile AS karafile,
      							ak.duration AS duration,
								ak.gain AS gain,
								(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     							THEN 1
        							ELSE 0
      							END) AS flag_dejavu,
								(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at,
								EXISTS(
									SELECT 1 FROM playlist_content pc
									JOIN playlist p ON pc.fk_id_playlist = p.pk_id_playlist
									JOIN user u ON   u.pk_id_user = p.fk_id_user
									WHERE pc.fk_id_kara = ak.kara_id
										AND p.flag_favorites = 1
										AND u.login = $username
								) AS flag_favorites,
								ak.created_at AS created_at,
								ak.modified_at as modified_at
							FROM karasdb.all_karas AS ak
 							WHERE ak.kara_id NOT IN (SELECT fk_id_kara FROM blacklist)
 							${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
							ORDER BY language, ak.serie IS NULL, serie COLLATE NOCASE,  ak.songtype DESC, ak.songorder, singer COLLATE NOCASE, ak.title COLLATE NOCASE
							`;

export const getKaraByKID = `SELECT ak.kara_id AS kara_id,
								ak.kid AS kid,
      							ak.title AS title,
      							ak.NORM_title AS NORM_title,
      							ak.songorder AS songorder,
      							ak.serie AS serie,
      							ak.NORM_serie AS NORM_serie,
      							ak.serie_altname AS serie_altname,
      							ak.NORM_serie_altname AS NORM_serie_altname,
								ak.serie_i18n AS serie_i18n,
      							ak.singer AS singer,
      							ak.NORM_singer AS NORM_singer,
      							ak.songtype AS songtype,
      							ak.creator AS creator,
      							ak.NORM_creator AS NORM_creator,
      							ak.language AS language,
      							ak.author AS author,
      							ak.NORM_author AS NORM_author,
      							ak.misc AS misc,
	  							(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
								(SELECT COUNT(pk_id_request) AS request FROM request WHERE fk_id_kara = ak.kara_id) AS requested,
      							ak.mediafile AS mediafile,
	  							ak.duration AS duration,
		  						ak.gain AS gain,
								(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     							THEN 1
        							ELSE 0
      							END) AS flag_dejavu,
								(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
							FROM all_karas AS ak
							WHERE ak.kid = $kid;
							`;

export const getKara = (lang) => `SELECT ak.kara_id AS kara_id,
    						ak.kid AS kid,
      						ak.title AS title,
      						ak.NORM_title AS NORM_title,
      						ak.songorder AS songorder,
      						COALESCE(
								(SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
								(SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
								ak.serie) AS serie,
						  COALESCE(
								(SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
								(SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
								ak.NORM_serie) AS NORM_serie,
      						ak.serie_altname AS serie_altname,
							ak.NORM_serie_altname AS NORM_serie_altname,
							ak.serie AS serie_orig,
							ak.serie_i18n AS serie_i18n,
      						ak.singer AS singer,
      						ak.NORM_singer AS NORM_singer,
      						ak.songtype AS songtype,
	  						ak.songwriter AS songwriter,
	  						ak.NORM_songwriter AS NORM_songwriter,
	  						ak.year AS year,
      						ak.creator AS creator,
							ak.NORM_creator AS NORM_creator,
							ak.groups AS groups,
							ak.NORM_groups AS NORM_groups,
      						ak.language AS language,
      						ak.author AS author,
      						ak.NORM_author AS NORM_author,
      						ak.misc AS misc,
							(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
							(SELECT COUNT(pk_id_request) AS request FROM request WHERE fk_id_kara = ak.kara_id) AS requested,
      						ak.mediafile AS mediafile,
							ak.subfile AS subfile,
	  						ak.karafile AS karafile,
	  						ak.duration AS duration,
	  						ak.gain AS gain,
							ak.created_at AS created_at,
							ak.modified_at as modified_at,
							(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     						THEN 1
        						ELSE 0
      						END) AS flag_dejavu,
							(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at,
							EXISTS(
    							SELECT 1 FROM playlist_content pc
    							JOIN playlist p ON pc.fk_id_playlist = p.pk_id_playlist
    							JOIN user u ON   u.pk_id_user = p.fk_id_user
    							WHERE pc.fk_id_kara = ak.kara_id
									AND p.flag_favorites = 1
									AND u.login = $username
							) AS flag_favorites
 						FROM karasdb.all_karas AS ak
						WHERE ak.kara_id = $kara_id
  						`;

export const getKaraMini = `SELECT ak.title AS title,
      						ak.subfile AS subfile,
							ak.duration AS duration
 						FROM karasdb.all_karas AS ak
						WHERE ak.kara_id = $kara_id
  						`;

export const isKara = `SELECT pk_id_kara
					FROM karasdb.kara
					WHERE pk_id_kara = $kara_id;
					`;

export const isKaraInPlaylist = `SELECT fk_id_kara
							FROM playlist_content
							WHERE fk_id_playlist = $playlist_id
							  AND fk_id_kara = $kara_id;
								`;

export const removeKaraFromPlaylist = `DELETE FROM playlist_content
									WHERE pk_id_plcontent IN ($playlistcontent_id)
									  AND fk_id_playlist = $playlist_id;
									`;

export const getSongCountPerUser = `SELECT COUNT(1) AS count
									FROM playlist_content AS pc
									WHERE pc.fk_id_user = $user_id
									  AND pc.fk_id_playlist = $playlist_id
									  AND pc.flag_free = 0
									`;

export const getTimeSpentPerUser = `SELECT SUM(ak.duration) AS timeSpent
									FROM karasdb.all_karas AS ak
									INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
									WHERE pc.fk_id_user = $user_id
									  AND pc.fk_id_playlist = $playlist_id
									  AND pc.flag_free = 0
									`;


export const resetViewcounts = 'DELETE FROM viewcount;';

export const updateFreeOrphanedSongs = `UPDATE playlist_content SET
									flag_free = 1
									WHERE created_at <= $expire_time;
								`;

export const updateKara = `UPDATE karasdb.kara SET
							title = $title,
							NORM_title = $NORM_title,
							year = $year,
							songorder = $songorder,
							mediafile = $mediafile,
							subfile = $subfile,
							duration = $duration,
							gain = $gain,
							modified_at = $modified_at,
							karafile = $karafile
						WHERE pk_id_kara = $kara_id
`;

export const insertKara = `INSERT INTO
							karasdb.kara(title, NORM_title, year, songorder, mediafile, subfile, duration, gain, modified_at, created_at, karafile, kid)
							VALUES($title, $NORM_title, $year, $songorder, $mediafile, $subfile, $duration, $gain, $modified_at, $created_at, $karafile, $kid);
`;

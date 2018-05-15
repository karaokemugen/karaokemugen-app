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

export const addKaraToWhitelist = `INSERT INTO whitelist(fk_id_kara,kid,created_at)
								SELECT $kara_id,kid,$created_at
								FROM karasdb.kara
								WHERE PK_id_kara = $kara_id;
								`;

export const addViewcount = `INSERT INTO viewcount(
								fk_id_kara,
								kid,
								modified_at) 
							VALUES($kara_id,$kid,$modified_at);
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


export const getAllKaras = (filterClauses) => `SELECT ak.kara_id AS kara_id,
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
	  							ak.songwriter AS songwriter,
	  							ak.NORM_songwriter AS NORM_songwriter,
	  							ak.year AS year,
	  							ak.NORM_creator AS NORM_creator,
      							ak.language AS language,
      							ak.author AS author,
      							ak.NORM_author AS NORM_author,
      							ak.misc AS misc,
								(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
      							ak.mediafile AS mediafile,
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
								) AS flag_favorites
							FROM karasdb.all_karas AS ak							
 							WHERE ak.kara_id NOT IN (SELECT fk_id_kara FROM blacklist)
 							${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
							ORDER BY ak.language, ak.serie IS NULL, ak.serie COLLATE NOCASE, ak.singer COLLATE NOCASE, ak.songtype DESC, ak.songorder, ak.title COLLATE NOCASE
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

export const getKara = `SELECT ak.kara_id AS kara_id,
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
	  						ak.songwriter AS songwriter,
	  						ak.NORM_songwriter AS NORM_songwriter,
	  						ak.year AS year,  
      						ak.creator AS creator,
      						ak.NORM_creator AS NORM_creator,
      						ak.language AS language,
      						ak.author AS author,
      						ak.NORM_author AS NORM_author,
      						ak.misc AS misc,
	  						(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
      						ak.mediafile AS mediafile,
							ak.subfile AS subfile,
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

export const removeKaraFromWhitelist = `DELETE FROM whitelist 
									WHERE pk_id_whitelist = $wlc_id;
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

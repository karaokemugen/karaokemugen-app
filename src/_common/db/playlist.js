// SQL for playlist management

export const countKarasInPlaylist = `SELECT COUNT(playlist_content.fk_id_kara) AS karaCount 
									FROM playlist_content 
									WHERE fk_id_playlist = $playlist_id;`;

export const updatePlaylistLastEditTime = `UPDATE playlist 
										SET modified_at = $modified_at 
										WHERE pk_id_playlist = $playlist_id;
										`;

export const emptyPlaylist = `DELETE FROM playlist_content 
							WHERE fk_id_playlist = $playlist_id;
							`;

export const deletePlaylist = `DELETE FROM playlist 
							WHERE pk_id_playlist = $playlist_id;
							`;

export const editPlaylist = `UPDATE playlist 
							SET name = $name,
							NORM_name = $NORM_name,
							modified_at = $modified_at,
							flag_visible = $flag_visible 
						WHERE pk_id_playlist = $playlist_id;
							`;

export const createPlaylist = `INSERT INTO playlist(
								name,
								NORM_name,
								num_karas,
								length,
								created_at,
								modified_at,
								flag_visible,
								flag_current,
								flag_public,
								flag_favorites,
								fk_id_user,
								time_left)
 							VALUES(
								$name,
								$NORM_name,
								0,
								0,
								$created_at,
								$modified_at,
								$flag_visible,
								$flag_current,
								$flag_public,
								$flag_favorites,
								(SELECT pk_id_user FROM user WHERE login = $username),
								0);
								`;

export const updatePlaylistKaraCount = `UPDATE playlist 
										SET num_karas = $kara_count 
										WHERE pk_id_playlist = $playlist_id;
										`;

export const getPLCByDate = `SELECT pc.pk_id_plcontent AS playlistcontent_id 
							FROM playlist_content AS pc
							WHERE pc.created_at = $date_added 
  							  AND pc.fk_id_playlist = $playlist_id
							ORDER BY pc.pos;`;

export const updatePLCSetPos = `UPDATE playlist_content 
								SET pos = $pos 
								WHERE pk_id_plcontent = $playlistcontent_id;`;


export const updatePlaylistDuration = `UPDATE playlist SET time_left = 
    									(SELECT ifnull(SUM(karasdb.kara.duration),0) AS duration
    									FROM karasdb.kara, playlist_content 
    									WHERE playlist_content.fk_id_kara = karasdb.kara.pk_id_kara  
    									AND playlist_content.fk_id_playlist = $playlist_id  
    									AND playlist_content.pos >= (select ifnull(pos,0) from playlist_content where flag_playing = 1 and playlist_content.fk_id_playlist = $playlist_id)),
    									length = 
    									(SELECT ifnull(SUM(karasdb.kara.duration),0) AS duration
    									FROM karasdb.kara, playlist_content 
    									WHERE playlist_content.fk_id_kara = 	karasdb.kara.pk_id_kara  
    								  	AND playlist_content.fk_id_playlist = $playlist_id
    								  	AND playlist_content.pos >= 0)
									WHERE pk_id_playlist = $playlist_id;`;

export const getPlaylistContentsKaraIDs = `SELECT pc.fk_id_kara AS kara_id,
										pc.pk_id_plcontent AS playlistcontent_id,
										pc.flag_playing AS flag_playing,
										pc.pos AS pos
										FROM playlist_content AS pc
										WHERE pc.fk_id_playlist = $playlist_id
										ORDER BY pc.pos,pc.created_at DESC;
										`;

export const getPlaylistContents = (filterClauses) => `SELECT ak.kara_id AS kara_id,
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
	  									ak.songwriter AS songwriter,
	  									ak.NORM_songwriter AS NORM_songwriter,
	  									ak.year AS year,
      									ak.songtype AS songtype,      
      									ak.creator AS creator,
      									ak.NORM_creator AS NORM_creator,
      									ak.language AS language,
      									ak.author AS author,
      									ak.NORM_author AS NORM_author,
      									ak.misc AS misc,
      									ak.gain AS gain,
      									pc.created_at AS created_at,
      									pc.pseudo_add AS pseudo_add,
      									pc.NORM_pseudo_add AS NORM_pseudo_add,
										u.login AS username,
      									pc.pos AS pos,
      									pc.pk_id_plcontent AS playlistcontent_id,
      									pc.flag_playing AS flag_playing,      
      									ak.mediafile AS mediafile,
	  									ak.duration AS duration,	  
	  									(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
      									(CASE WHEN wl.fk_id_kara = ak.kara_id
	     									THEN 1
        									ELSE 0
      									END) AS flag_whitelisted,
      									(CASE WHEN bl.fk_id_kara = ak.kara_id
	      									THEN 1
        									ELSE 0
      									END) AS flag_blacklisted,
										(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     									THEN 1
        									ELSE 0
										  END) AS flag_dejavu,
										  (SELECT COUNT(*) 
    								FROM upvote AS up
    								WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes,
									EXISTS(SELECT fk_id_plcontent FROM upvote, user as u2 WHERE fk_id_plcontent  = pc.pk_id_plcontent AND fk_id_user = u2.pk_id_user AND u2.login = $username) AS flag_upvoted,
										(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
									FROM karasdb.all_karas AS ak 
									INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
									LEFT OUTER JOIN user AS u ON u.pk_id_user = pc.fk_id_user
									LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
									LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
									WHERE pc.fk_id_playlist = $playlist_id
									${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
									ORDER BY pc.pos,pc.created_at DESC
									`;

export const getPlaylistContentsMini = `SELECT ak.kara_id AS kara_id,
												    ak.language AS language,
      												ak.title AS title,
      												ak.songorder AS songorder,
      												ak.serie AS serie,
													ak.serie_i18n AS serie_i18n,
      												ak.songtype AS songtype,      
	  												ak.singer AS singer,
      												ak.gain AS gain,
      												pc.pseudo_add AS pseudo_add,
													pc.created_at AS created_at,
      												ak.mediafile AS mediafile,
	  												pc.pos AS pos,
													pc.flag_playing AS flag_playing,
													pc.pk_id_plcontent AS 			playlistcontent_id,
													ak.kid AS kid,
													pc.fk_id_user AS user_id,
													pc.flag_free AS flag_free,
													u.login AS username
											FROM karasdb.all_karas AS ak 
											INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
											LEFT OUTER JOIN user AS u ON u.pk_id_user = pc.fk_id_user
											WHERE pc.fk_id_playlist = $playlist_id
											ORDER BY pc.pos;
											`;

export const getPlaylistPos = `SELECT pc.pos AS pos,
      								pc.pk_id_plcontent AS playlistcontent_id    
							FROM playlist_content AS pc
							WHERE pc.fk_id_playlist = $playlist_id
							ORDER BY pc.pos,pc.created_at DESC;
							`;

export const getPlaylistKaraNames = `SELECT pc.pos AS pos,
      								pc.pk_id_plcontent AS playlistcontent_id,
									(ak.language || (CASE WHEN ak.serie IS NULL
	     									THEN ak.singer
        									ELSE ak.serie
      									END) || ak.songtype || ak.songorder || ak.title) AS karaname
							FROM karasdb.all_karas AS ak 
							INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
							WHERE pc.fk_id_playlist = $playlist_id
							ORDER BY karaname;
							`;


export const getPLCInfo = `SELECT ak.kara_id AS kara_id,
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
	  							ak.songwriter AS songwriter,
	  							ak.NORM_songwriter AS NORM_songwriter,
	  							ak.year AS year,
      							ak.songtype AS songtype,      
      							ak.creator AS creator,
      							ak.NORM_creator AS NORM_creator,
      							ak.language AS language,
      							ak.author AS author,
      							ak.NORM_author AS NORM_author,
      							ak.misc AS misc,
      							ak.gain AS gain,
      							pc.created_at AS created_at,
      							pc.pseudo_add AS pseudo_add,
      							pc.NORM_pseudo_add AS NORM_pseudo_add,
								u.login AS username,
      							pc.pos AS pos,
      							pc.pk_id_plcontent AS playlistcontent_id,
	    						pc.fk_id_playlist as playlist_id,      
      							pc.flag_playing AS flag_playing,	        
      							ak.mediafile AS mediafile,
	  							ak.duration AS duration,
	  							ak.gain AS gain,
								  (SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
								  EXISTS(
    								SELECT 1 FROM playlist_content pc
    								JOIN playlist p ON pc.fk_id_playlist = p.pk_id_playlist
    								JOIN user u ON   u.pk_id_user = p.fk_id_user
    									WHERE pc.fk_id_kara = ak.kara_id 
										AND p.flag_favorites = 1 
										AND u.login = $username
  								) AS flag_favorites,
      							(CASE WHEN wl.fk_id_kara = ak.kara_id
	     							THEN 1
        							ELSE 0
      							END) AS flag_whitelisted,
      							(CASE WHEN bl.fk_id_kara = ak.kara_id
	      							THEN 1
        							ELSE 0
      							END) AS flag_blacklisted,
	  							(SELECT ifnull(SUM(all_karas.duration) - ak.duration,0)
								FROM karasdb.all_karas AS all_karas
    							INNER JOIN playlist_content ON all_karas.kara_id = playlist_content.fk_id_kara
    							WHERE playlist_content.fk_id_playlist = pc.fk_id_playlist
    							AND playlist_content.pos BETWEEN (SELECT ifnull(pos,0) FROM playlist_content WHERE flag_playing = 1 AND fk_id_playlist = pc.fk_id_playlist) AND pc.pos) AS time_before_play,

								(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     							THEN 1
        							ELSE 0
      							END) AS flag_dejavu,
								(SELECT COUNT(*) 
    								FROM upvote AS up
    								WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes,
								EXISTS(SELECT fk_id_plcontent FROM upvote, user as u2 WHERE fk_id_plcontent  = pc.pk_id_plcontent AND fk_id_user = u2.pk_id_user AND u2.login = $username) AS flag_upvoted,
								(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
						FROM karasdb.all_karas AS ak
						INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
						LEFT OUTER JOIN user AS u ON u.pk_id_user = pc.fk_id_user    	
						LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
						LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
						LEFT OUTER JOIN playlist AS p ON pc.fk_id_playlist = p.pk_id_playlist
						WHERE  pc.pk_id_plcontent = $playlistcontent_id
							`;

export const getPLCInfoMini = `SELECT pc.fk_id_kara AS kara_id,
							ak.title AS title,
							ak.serie AS serie,
							ak.serie_i18n AS serie_i18n,
							pc.pseudo_add AS pseudo_add,
							pc.NORM_pseudo_add AS NORM_pseudo_add,
						  u.login AS username,
							pc.pk_id_plcontent AS playlistcontent_id,
						  pc.fk_id_playlist AS playlist_id,
						  (SELECT COUNT(*) 
    								FROM upvote AS up
									WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes
				  FROM karasdb.all_karas AS ak
				  INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id 
				  LEFT OUTER JOIN user AS u ON u.pk_id_user = pc.fk_id_user    	
				  WHERE  pc.pk_id_plcontent = $playlistcontent_id
					  `;


export const getPLCByKID = `SELECT ak.kara_id AS kara_id,
								ak.title AS title,
								ak.songorder AS songorder,
								ak.serie AS serie,
								ak.serie_i18n AS serie_i18n,
								ak.songtype AS songtype,
								ak.singer AS singer,
								ak.gain AS gain,
								pc.pseudo_add AS pseudo_add,
								ak.mediafile AS mediafile,
								pc.pos AS pos,
								pc.flag_playing AS flag_playing,
								pc.pk_id_plcontent AS playlistcontent_id,
								ak.kid AS kid,
								(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM 	viewcount WHERE fk_id_kara = ak.kara_id)
	     							THEN 1
        							ELSE 0
      							END) AS flag_dejavu,
								(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
							FROM karasdb.all_karas AS ak
							INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id 
							WHERE pc.fk_id_playlist = $playlist_id  
								AND pc.kid = $kid 
							ORDER BY pc.pos;
						`;

export const getPlaylistInfo = `SELECT p.pk_id_playlist AS playlist_id, 
									p.name AS name, 
									p.num_karas AS num_karas, 
									p.length AS length, 
									p.time_left AS time_left, 
									p.created_at AS created_at, 
									p.modified_at AS modified_at, 
									p.flag_visible AS flag_visible, 
									p.flag_current AS flag_current, 
									p.flag_public AS flag_public,
									p.flag_favorites AS flag_favorites,
									u.login AS username 
									FROM playlist AS p, user AS u
									WHERE pk_id_playlist = $playlist_id
									  AND u.pk_id_user = p.fk_id_user
							`;

export const getPlaylists = `SELECT p.pk_id_playlist AS playlist_id, 
									p.name AS name, 
									p.num_karas AS num_karas, 
									p.length AS length, 
									p.time_left AS time_left, 
									p.created_at AS created_at, 
									p.modified_at AS modified_at, 
									p.flag_visible AS flag_visible, 
									p.flag_current AS flag_current, 
									p.flag_public AS flag_public,
									p.flag_favorites AS flag_favorites,
									u.login AS username
 							FROM playlist AS p, user AS u
							WHERE p.fk_id_user = u.pk_id_user  
 							`;

export const getFavoritePlaylists = `
							SELECT p.pk_id_playlist AS playlist_id, 
									p.name AS name, 
									p.num_karas AS num_karas, 
									p.length AS length, 
									p.time_left AS time_left, 
									p.created_at AS created_at, 
									p.modified_at AS modified_at, 
									p.flag_visible AS flag_visible, 
									p.flag_current AS flag_current, 
									p.flag_public AS flag_public,
									p.flag_favorites AS flag_favorites,
									u.login AS username
 							FROM playlist AS p, user AS u
							WHERE p.fk_id_user = u.pk_id_user
							  AND u.login = $username
							  AND p.flag_favorites = 1
							`;

export const testCurrentPlaylist = `SELECT pk_id_playlist AS playlist_id
								FROM playlist 
								WHERE flag_current = 1;
								`;

export const setPLCFree = `UPDATE playlist_content 
							SET flag_free = 1
							WHERE pk_id_plcontent = $plc_id;
							`;

export const setPLCFreeBeforePos = `UPDATE playlist_content
							SET flag_free = 1
							WHERE fk_id_playlist = $playlist_id
							  AND pos <= $pos;
							`;

export const testPublicPlaylist = `SELECT pk_id_playlist AS playlist_id
								FROM playlist 
								WHERE flag_public = 1;
								`;

export const shiftPosInPlaylist = `UPDATE playlist_content
   									SET pos = pos+$shift
 								WHERE fk_id_playlist = $playlist_id
   									AND pos >= $pos
								`;

export const getMaxPosInPlaylist = `SELECT MAX(pos) AS maxpos 
								FROM playlist_content 
								WHERE fk_id_playlist = $playlist_id;
								`;

export const raisePosInPlaylist = `UPDATE playlist_content
   									SET pos = $newpos
 								WHERE fk_id_playlist = $playlist_id
   									AND pos = $pos
								`;

export const testPlaylist = `SELECT pk_id_playlist 
								FROM playlist 
								WHERE pk_id_playlist = $playlist_id
							`;

export const testPlaylistFlagPlaying = `SELECT pk_id_plcontent 
									FROM playlist_content 
									WHERE fk_id_playlist = $playlist_id
										AND flag_playing = 1
									`;

export const setCurrentPlaylist = `UPDATE playlist 
									SET flag_current = 1 
									WHERE pk_id_playlist = $playlist_id;				`;

export const unsetCurrentPlaylist = `UPDATE playlist 
									SET flag_current = 0;
									`;

export const setVisiblePlaylist = `UPDATE playlist 
									SET flag_visible = 1 
									WHERE pk_id_playlist = $playlist_id;				`;

export const unsetVisiblePlaylist = `UPDATE playlist 
									SET flag_visible = 0
									WHERE pk_id_playlist = $playlist_id;				`;

export const unsetPublicPlaylist = `UPDATE playlist 
									SET flag_public = 0;									`;


export const setPublicPlaylist = `UPDATE playlist 
									SET flag_public = 1 
									WHERE pk_id_playlist = $playlist_id;
									`;

export const unsetPlaying = `UPDATE playlist_content 
							SET flag_playing = 0 
							WHERE fk_id_playlist = $playlist_id
							 AND flag_playing = 1;
							`;

export const setPlaying = `UPDATE playlist_content 
						SET flag_playing = 1 
						WHERE pk_id_plcontent = $playlistcontent_id;
						`;

export const countPlaylistUsers = `SELECT COUNT(DISTINCT fk_id_user) AS NumberOfUsers
                            FROM playlist_content
                            WHERE fk_id_playlist = $playlist_id;
							`;

export const getMaxPosInPlaylistForPseudo = `SELECT MAX(pos) AS maxpos
                                        FROM playlist_content
                                        WHERE fk_id_playlist = $playlist_id
                                            AND fk_id_user = $user_id;
										`;

export const trimPlaylist = `DELETE FROM playlist_content
							 WHERE fk_id_playlist = $playlist_id
							 	AND pos > $pos;
							`;

export const countPlaylist = (filterClauses) => `SELECT COUNT(*) as count
							FROM playlist_content, karasdb.all_karas AS ak							
 							WHERE playlist_content.fk_id_kara = ak.kara_id
							AND playlist_content.fk_id_playlist = $playlist_id
 							${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
							`;
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
    									(SELECT ifnull(SUM(karasdb.kara.videolength),0) AS duration
    									FROM karasdb.kara, playlist_content 
    									WHERE playlist_content.fk_id_kara = karasdb.kara.pk_id_kara  
    									AND playlist_content.fk_id_playlist = $playlist_id  
    									AND playlist_content.pos >= (select ifnull(pos,0) from playlist_content where flag_playing = 1 and playlist_content.fk_id_playlist = $playlist_id)),
    									length = 
    									(SELECT ifnull(SUM(karasdb.kara.videolength),0) AS duration
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

export const getPlaylistContents = `SELECT ak.kara_id AS kara_id,
      									ak.kid AS kid,
      									ak.title AS title,
      									ak.NORM_title AS NORM_title,
      									ak.songorder AS songorder,
      									ak.serie AS serie,
      									ak.NORM_serie AS NORM_serie,
      									ak.serie_altname AS serie_altname,
      									ak.NORM_serie_altname AS NORM_serie_altname,
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
      									ak.videofile AS videofile,
	  									ak.videolength AS duration,	  
	  									ak.viewcount AS viewcount,
      									(CASE WHEN wl.fk_id_kara = ak.kara_id
	     									THEN 1
        									ELSE 0
      									END) AS flag_whitelisted,
      									(CASE WHEN bl.fk_id_kara = ak.kara_id
	      									THEN 1
        									ELSE 0
      									END) AS flag_blacklisted,
										(CASE WHEN $dejavu_time > (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     									THEN 1
        									ELSE 0
      									END) AS flag_dejavu,
										(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
									FROM karasdb.all_karas AS ak 
									INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
									LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
									LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
									WHERE pc.fk_id_playlist = $playlist_id
									ORDER BY pc.pos,pc.created_at DESC;
									`;

export const getPlaylistContentsForPlayer = `SELECT ak.kara_id AS kara_id,
      												ak.title AS title,
      												ak.songorder AS songorder,
      												ak.serie AS serie,
      												ak.songtype AS songtype,      
	  												ak.singer AS singer,
      												ak.gain AS gain,
      												pc.pseudo_add AS pseudo_add,
      												ak.videofile AS videofile,
	  												pc.pos AS pos,
	  												pc.flag_playing AS flag_playing,		  												pc.pk_id_plcontent AS 			playlistcontent_id,
	  												ak.kid AS kid
											FROM karasdb.all_karas AS ak 
											INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
											WHERE pc.fk_id_playlist = $playlist_id
											ORDER BY pc.pos;
											`;

export const getPlaylistPos = `SELECT pc.pos AS pos,
      								pc.pk_id_plcontent AS playlistcontent_id    
							FROM playlist_content AS pc
							WHERE pc.fk_id_playlist = $playlist_id
							ORDER BY pc.pos,pc.created_at DESC;
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
      							ak.videofile AS videofile,
	  							ak.videolength AS duration,
	  							ak.gain AS gain,
	  							ak.viewcount AS viewcount,
      							(CASE WHEN wl.fk_id_kara = ak.kara_id
	     							THEN 1
        							ELSE 0
      							END) AS flag_whitelisted,
      							(CASE WHEN bl.fk_id_kara = ak.kara_id
	      							THEN 1
        							ELSE 0
      							END) AS flag_blacklisted,
	  							(SELECT ifnull(SUM(all_karas.videolength) - ak.videolength,0)
    							FROM karasdb.all_karas AS all_karas
    							INNER JOIN playlist_content ON all_karas.kara_id = playlist_content.fk_id_kara
    							WHERE playlist_content.fk_id_playlist = pc.fk_id_playlist
    							AND playlist_content.pos BETWEEN (SELECT ifnull(pos,0) FROM playlist_content WHERE flag_playing = 1) AND pc.pos) AS time_before_play,
								(CASE WHEN $dejavu_time > (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     							THEN 1
        							ELSE 0
      							END) AS flag_dejavu,
								(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
						FROM karasdb.all_karas AS ak
						INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
						LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
						LEFT OUTER JOIN playlist AS p ON pc.fk_id_playlist = p.pk_id_playlist
						LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
						WHERE  pc.pk_id_plcontent = $playlistcontent_id
							`;

export const getPLCByKID = `SELECT ak.kara_id AS kara_id,
								ak.title AS title,
								ak.songorder AS songorder,
								ak.serie AS serie,
								ak.songtype AS songtype,
								ak.singer AS singer,
								ak.gain AS gain,
								pc.pseudo_add AS pseudo_add,
								ak.videofile AS videofile,
								pc.pos AS pos,
								pc.flag_playing AS flag_playing,
								pc.pk_id_plcontent AS playlistcontent_id,
								ak.kid AS kid,
								(CASE WHEN $dejavu_time > (SELECT max(modified_at) FROM 	viewcount WHERE fk_id_kara = ak.kara_id)
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

export const getPlaylistInfo = `SELECT pk_id_playlist AS playlist_id, 
									name, 
									num_karas, 
									length, 
									time_left, 
									created_at, 
									modified_at, 
									flag_visible, 
									flag_current, 
									flag_public  
									FROM playlist 
									WHERE pk_id_playlist = $playlist_id
							`;

export const getPlaylists = `SELECT pk_id_playlist AS playlist_id, 
									name, 
									num_karas, 
									length, 
									time_left, 
									created_at, 
									modified_at, 
									flag_visible, 
									flag_current, 
									flag_public
 							FROM playlist
 							`;

export const testCurrentPlaylist = `SELECT pk_id_playlist AS playlist_id
								FROM playlist 
								WHERE flag_current = 1;
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

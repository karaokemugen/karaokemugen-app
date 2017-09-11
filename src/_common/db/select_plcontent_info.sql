SELECT ak.kara_id AS kara_id,
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
      pc.pos AS pos,
      pc.pk_id_plcontent AS playlistcontent_id,
	    pc.fk_id_playlist as playlist_id,
      pc.generated_subfile AS generated_subfile,
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
      END) AS flag_blacklisted
FROM karasdb.all_karas AS ak 
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
LEFT OUTER JOIN playlist AS p ON pc.fk_id_playlist = p.pk_id_playlist
LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
WHERE  pc.pk_id_plcontent = $playlistcontent_id
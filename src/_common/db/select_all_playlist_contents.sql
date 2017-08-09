SELECT ak.pk_id_kara AS id_kara,
      ak.kid AS kid,
      ak.title AS title,
      ak.NORM_title AS NORM_title,
      ak.songorder AS songorder,
      ak.series AS series,
      ak.NORM_series AS NORM_series,
      ak.series_altname AS series_altname,
      ak.NORM_series_altname AS NORM_series_altname,
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
      pc.date_add AS date_add,
      pc.pseudo_add AS pseudo_add,
      pc.NORM_pseudo_add AS NORM_pseudo_add,
      pc.pos AS pos,
      pc.pk_idplcontent AS playlistcontent_id,
      pc.flag_playing AS flag_playing,
      ak.subfile AS subfile,
      ak.videofile AS videofile,
	  ak.videolength AS duration,
	  ak.viewcount AS viewcount,
      (CASE WHEN wl.fk_id_kara = ak.pk_id_kara
	     	THEN 1
        ELSE 0
      END) AS flag_whitelisted,
      (CASE WHEN bl.fk_id_kara = ak.pk_id_kara
	      THEN 1
        ELSE 0
      END) AS flag_blacklisted
 FROM karasdb.all_karas AS ak 
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.pk_id_kara
LEFT OUTER JOIN blacklist AS bl ON ak.pk_id_kara = bl.fk_id_kara
LEFT OUTER JOIN whitelist AS wl ON ak.pk_id_kara = wl.fk_id_kara
ORDER BY pc.date_add DESC;
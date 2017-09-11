SELECT ak.kara_id AS kara_id,
      ak.title AS title,
      ak.songorder AS songorder,
      ak.serie AS serie,
      ak.songtype AS songtype,      
      ak.gain AS gain,
      pc.pseudo_add AS pseudo_add,
      ak.videofile AS videofile,
	  pc.pos AS pos,
	  pc.flag_playing AS flag_playing,	  
	  pc.pk_id_plcontent AS playlistcontent_id,
	  ak.kid AS kid
FROM karasdb.all_karas AS ak 
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
WHERE pc.fk_id_playlist = $playlist_id
ORDER BY pc.pos;
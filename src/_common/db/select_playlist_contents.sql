SELECT ak.PK_id_kara AS id_kara,
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
      pc.pos AS pos
 FROM karasdb.all_karas AS ak, playlist_content AS pc
WHERE pc.fk_id_playlist = $playlist_id
  AND pc.fk_id_kara = ak.PK_id_kara
ORDER BY pc.pos,pc.date_add DESC;
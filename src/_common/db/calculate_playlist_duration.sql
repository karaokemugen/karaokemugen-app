SELECT SUM(karasdb.kara.videolength) AS duration
  FROM karasdb.kara, playlist_content
 WHERE playlist_content.fk_id_kara = karasdb.kara.pk_id_kara
   AND playlist_content.fk_id_playlist = $playlist_id;
SELECT karasdb.all_karas.title 
 FROM karasdb.all_karas, playlist_content
WHERE playlist_content.fk_id_playlist = $playlist_id
  AND playlist_content.fk_id_kara = karasdb.all_karas.PK_id_kara;
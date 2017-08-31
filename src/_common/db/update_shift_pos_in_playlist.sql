UPDATE playlist_content
   SET pos = $pos+$shift
 WHERE fk_id_playlist = $playlist_id
   AND pos > $pos
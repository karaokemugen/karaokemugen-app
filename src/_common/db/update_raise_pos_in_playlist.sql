UPDATE playlist_content
   SET pos = $newpos
 WHERE fk_id_playlist = $playlist_id
   AND pos = $pos

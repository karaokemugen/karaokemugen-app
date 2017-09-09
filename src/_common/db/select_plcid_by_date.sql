SELECT pc.pk_id_plcontent AS playlistcontent_id 
FROM playlist_content AS pc
WHERE pc.created_at = $date_added 
  AND pc.fk_id_playlist = $playlist_id
ORDER BY pc.pos;
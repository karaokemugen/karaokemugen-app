SELECT pc.pos AS pos,
      pc.pk_id_plcontent AS playlistcontent_id    
FROM playlist_content AS pc
WHERE pc.fk_id_playlist = $playlist_id
ORDER BY pc.pos,pc.created_at DESC;
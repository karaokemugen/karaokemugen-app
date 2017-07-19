SELECT fk_id_playlist AS playlist_id,
       fk_id_kara AS kara_id
FROM   playlist_content
WHERE  pk_idplcontent = $playlistcontent_id
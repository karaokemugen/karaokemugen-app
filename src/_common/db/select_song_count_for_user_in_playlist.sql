SELECT COUNT(1) AS count
FROM playlist_content
WHERE pseudo_add = $requester
AND fk_id_playlist = $playlist_id
AND pos > IFNULL((select pos from playlist_content WHERE flag_playing  = 1),0)
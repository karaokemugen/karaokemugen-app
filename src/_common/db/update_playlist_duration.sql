UPDATE playlist SET time_left = 
    (SELECT ifnull(SUM(karasdb.kara.videolength),0) AS duration
    FROM karasdb.kara, playlist_content 
    WHERE playlist_content.fk_id_kara = karasdb.kara.pk_id_kara  
    AND playlist_content.fk_id_playlist = $playlist_id  
    AND playlist_content.pos >= (select ifnull(pos,0) from playlist_content where flag_playing = 1)),
    length = 
    (SELECT ifnull(SUM(karasdb.kara.videolength),0) AS duration
    FROM karasdb.kara, playlist_content 
    WHERE playlist_content.fk_id_kara = karasdb.kara.pk_id_kara  
    AND playlist_content.fk_id_playlist = $playlist_id
    AND playlist_content.pos >= 0)
WHERE pk_id_playlist = $playlist_id;
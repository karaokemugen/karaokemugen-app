INSERT INTO playlist_content(fk_id_playlist,fk_id_kara,kid,created_at,pseudo_add,NORM_pseudo_add,pos,flag_playing) 
SELECT $playlist_id,$kara_id,kid,$created_at,$pseudo_add,$NORM_pseudo_add,$pos,0
FROM karasdb.kara
WHERE PK_id_kara = $kara_id;
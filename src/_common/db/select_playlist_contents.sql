SELECT ak.PK_id_kara AS id_kara,
      ak.title AS title,
      ak.songorder AS songorder,
      ak.series AS series,
      ak.singer AS singer,
      ak.songtype AS songtype,
      ak.creator AS creator,
      ak.language AS language,
      ak.author AS author,
      ak.misc AS misc
 FROM karasdb.all_karas AS ak, playlist_content
WHERE playlist_content.fk_id_playlist = $playlist_id
  AND playlist_content.fk_id_kara = ak.PK_id_kara
ORDER BY playlist_content.pos;
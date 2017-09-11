SELECT a.ass AS ass
  FROM karasdb.ass AS a
 WHERE a.fk_id_kara = $kara_id;
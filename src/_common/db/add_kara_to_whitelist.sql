INSERT INTO whitelist(fk_id_kara,kid,created_at)
SELECT $kara_id,kid,$created_at
FROM karasdb.kara
WHERE PK_id_kara = $kara_id;
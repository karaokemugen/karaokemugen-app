DELETE FROM blacklist;

INSERT INTO blacklist (fk_id_kara, kid, created_at, reason)
SELECT kt.fk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Tag : ' || t.name || ' (type ' || t.tagtype || ')'
FROM blacklist_criteria AS blc
INNER JOIN karasdb.tag t ON blc.type = t.tagtype AND CAST(blc.value AS INTEGER) = t.pk_id_tag
INNER JOIN karasdb.kara_tag kt ON t.pk_id_tag = kt.fk_id_tag
INNER JOIN karasdb.kara k on k.pk_id_kara = kt.fk_id_kara
WHERE blc.type BETWEEN 1 and 999
AND   kt.fk_id_kara NOT IN (select fk_id_kara from whitelist)
    UNION    
SELECT kt.fk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Tag by name : ' || blc.value
FROM blacklist_criteria blc
INNER JOIN karasdb.tag t ON  blc.value = t.NORM_name
INNER JOIN karasdb.kara_tag kt ON t.pk_id_tag = kt.fk_id_tag
INNER JOIN karasdb.kara k on k.pk_id_kara = kt.fk_id_kara
WHERE blc.type = 0
AND   kt.fk_id_kara NOT IN (select fk_id_kara from whitelist)
    UNION    
SELECT k.pk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Series by name : ' ||  blc.value
FROM blacklist_criteria blc
INNER JOIN karasdb.kara k ON s.NORM_name LIKE ('%' || blc.value || '%')
INNER JOIN karasdb.serie s ON s.pk_id_serie = ks.fk_id_serie
INNER JOIN karasdb.kara_serie ks ON ks.fk_id_kara = k.pk_id_kara
WHERE blc.type = 1000
AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
    UNION    
SELECT CAST(blc.value AS INTEGER), k.kid, strftime('%s','now') ,'Blacklisted Song manually'
FROM blacklist_criteria blc
INNER JOIN karasdb.kara k ON k.pk_id_kara = blc.value
WHERE blc.type = 1001
AND   CAST(blc.value AS INTEGER) NOT IN (select fk_id_kara from whitelist);

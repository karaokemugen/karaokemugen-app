DELETE FROM blacklist;

INSERT INTO blacklist (fk_id_kara, kid, ban_date, ban_reason)
SELECT kt.FK_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Tag : ' || t.name || ' (type ' || t.tagtype || ')'
FROM blacklist_criteria AS blc
INNER JOIN karasdb.tag t ON blc.blcriteria_type = t.tagtype AND CAST(blc.blcriteria_value AS INTEGER) = t.PK_id_tag
INNER JOIN karasdb.kara_tag kt ON t.PK_id_tag = kt.FK_id_tag
INNER JOIN karasdb.kara k on k.PK_id_kara = kt.FK_id_kara
WHERE blc.blcriteria_type BETWEEN 1 and 999
AND   kt.FK_id_kara NOT IN (select fk_id_kara from whitelist)
    UNION    
SELECT kt.FK_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Tag by name : ' || blc.blcriteria_value
FROM blacklist_criteria blc
INNER JOIN karasdb.tag t ON  blc.blcriteria_value = t.NORM_name
INNER JOIN karasdb.kara_tag kt ON t.PK_id_tag = kt.fk_id_tag
INNER JOIN karasdb.kara k on k.PK_id_kara = kt.FK_id_kara
WHERE blc.blcriteria_type = 0
AND   kt.FK_id_kara NOT IN (select fk_id_kara from whitelist)
    UNION    
SELECT k.PK_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Series by name : ' ||  blc.blcriteria_value
FROM blacklist_criteria blc
INNER JOIN karasdb.kara k ON s.NORM_name LIKE ('%' || blc.blcriteria_value || '%')
INNER JOIN karasdb.series s ON s.PK_id_series = ks.FK_id_series
INNER JOIN karasdb.kara_series ks ON ks.FK_id_kara = k.PK_id_kara
WHERE blc.blcriteria_type = 1000
AND   k.PK_id_kara NOT IN (select fk_id_kara from whitelist)
    UNION    
SELECT CAST(blc.blcriteria_value AS INTEGER), k.kid, strftime('%s','now') ,'Blacklisted Song manually'
FROM blacklist_criteria blc
INNER JOIN karasdb.kara k ON k.PK_id_kara = blc.blcriteria_value
WHERE blc.blcriteria_type = 1001
AND   CAST(blc.blcriteria_value AS INTEGER) NOT IN (select fk_id_kara from whitelist);

ALTER TABLE blacklist ADD COLUMN fk_id_blcriteria INTEGER DEFAULT 0;

TRUNCATE blacklist;
INSERT INTO blacklist (fk_kid, created_at, reason, fk_id_blcriteria)
	SELECT kt.fk_kid, now() ,'Blacklisted Tag : ' || t.name || ' (type ' || blc.type || ')', blc.pk_id_blcriteria
	FROM blacklist_criteria AS blc
	INNER JOIN tag t ON t.types @> ARRAY[blc.type] AND blc.value = t.pk_tid::varchar
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE blc.type BETWEEN 1 and 999
		AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT kt.fk_kid, now() ,'Blacklisted Tag by name : ' || blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN tag t ON unaccent(t.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE blc.type = 0
	AND   kt.fk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Series by name : ' ||  blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN serie_lang sl ON unaccent(sl.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_serie ks ON sl.fk_sid = ks.fk_sid
	INNER JOIN kara k ON ks.fk_kid = k.pk_kid
	WHERE blc.type = 1000
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song manually', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k ON k.pk_kid = blc.value::uuid
	WHERE blc.type = 1001
	AND   blc.value::uuid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song longer than ' || blc.value || ' seconds', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration >= blc.value::integer
	WHERE blc.type = 1002
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Song shorter than ' || blc.value || ' seconds', blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration <= blc.value::integer
	WHERE blc.type = 1003
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
UNION
	SELECT k.pk_kid, now() ,'Blacklisted Title by name : ' ||  blc.value, blc.pk_id_blcriteria
	FROM blacklist_criteria blc
	INNER JOIN kara k ON unaccent(k.title) LIKE ('%' || blc.value || '%')
	WHERE blc.type = 1004
	AND   k.pk_kid NOT IN (select fk_kid from whitelist)
ON CONFLICT DO NOTHING;
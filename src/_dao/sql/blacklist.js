// SQL for Blacklist management

export const emptyBlacklistCriterias = 'DELETE FROM blacklist_criteria;';

export const generateBlacklist = `
DELETE FROM blacklist;
INSERT INTO blacklist (fk_id_kara, kid, created_at, reason)
	SELECT kt.fk_id_kara, k.kid, now() ,'Blacklisted Tag : ' || t.name || ' (type ' || t.tagtype || ')'
	FROM blacklist_criteria AS blc
	INNER JOIN tag t ON blc.type = t.tagtype AND CAST(blc.value AS INTEGER) = t.pk_id_tag
	INNER JOIN kara_tag kt ON t.pk_id_tag = kt.fk_id_tag
	INNER JOIN kara k on k.pk_id_kara = kt.fk_id_kara
	WHERE blc.type BETWEEN 1 and 999
		AND   kt.fk_id_kara NOT IN (select fk_id_kara from whitelist)
UNION
	SELECT kt.fk_id_kara, k.kid, now() ,'Blacklisted Tag by name : ' || blc.value
	FROM blacklist_criteria blc
	INNER JOIN tag t ON unaccent(t.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_tag kt ON t.pk_id_tag = kt.fk_id_tag
	INNER JOIN kara k on k.pk_id_kara = kt.fk_id_kara
	WHERE blc.type = 0
	AND   kt.fk_id_kara NOT IN (select fk_id_kara from whitelist)
UNION
	SELECT k.pk_id_kara, k.kid, now() ,'Blacklisted Series by name : ' ||  blc.value
	FROM blacklist_criteria blc
	INNER JOIN serie_lang sl ON unaccent(sl.name) LIKE ('%' || blc.value || '%')
	INNER JOIN kara_serie ks ON sl.fk_id_serie = ks.fk_id_serie
	INNER JOIN kara k ON ks.fk_id_kara = k.pk_id_kara
	WHERE blc.type = 1000
	AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
UNION
	SELECT CAST(blc.value AS INTEGER), k.kid, now() ,'Blacklisted Song manually'
	FROM blacklist_criteria blc
	INNER JOIN kara k ON k.pk_id_kara = blc.value::integer
	WHERE blc.type = 1001
	AND   CAST(blc.value AS INTEGER) NOT IN (select 	fk_id_kara from whitelist)
UNION
	SELECT k.pk_id_kara, k.kid, now() ,'Blacklisted Song longer than ' || blc.value || ' seconds'
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration >= blc.value::integer
	WHERE blc.type = 1002
	AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
UNION
	SELECT k.pk_id_kara, k.kid, now() ,'Blacklisted Song shorter than ' || blc.value || ' seconds'
	FROM blacklist_criteria blc
	INNER JOIN kara k on k.duration <= blc.value::integer
	WHERE blc.type = 1003
	AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
UNION
	SELECT k.pk_id_kara, k.kid, now() ,'Blacklisted Title by name : ' ||  blc.value
	FROM blacklist_criteria blc
	INNER JOIN kara k ON unaccent(k.title) LIKE ('%' || blc.value || '%')
	WHERE blc.type = 1004
	AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
`;

export const getBlacklistCriterias = `
SELECT pk_id_blcriteria AS blcriteria_id,
	type,
	value
FROM blacklist_criteria;
`;

export const addBlacklistCriteria = `
INSERT INTO blacklist_criteria(
	value,
	type,
	uniquevalue
)
VALUES (:blcvalue,:blctype,:blcuniquevalue);
`;

export const deleteBlacklistCriteria = `
DELETE FROM blacklist_criteria
WHERE pk_id_blcriteria = $1
`;

export const getBlacklistContents = (filterClauses, lang, limitClause, offsetClause) => `
SELECT ak.kara_id AS kara_id,
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie_altname AS serie_altname,
  ak.serie_i18n AS serie_i18n,
  ak.serie_id AS serie_id,
  ak.seriefiles AS seriefiles,
  ak.subfile AS subfile,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize
  (
	SELECT COUNT(pk_id_viewcount) AS viewcount
	FROM viewcount
	WHERE fk_id_kara = ak.kara_id
  ) AS viewcount,
  (
	SELECT COUNT(pk_id_request) AS request
	FROM request
	WHERE fk_id_kara = ak.kara_id
  ) AS requested,
  ak.duration AS duration,
  bl.created_at AS created_at,
  bl.reason AS reason_add,
  FROM all_karas AS ak
  INNER JOIN blacklist AS bl ON bl.fk_id_kara = ak.kara_id
  WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY ak.languages_sortable, ak.serie IS NULL, lower(unaccent(serie)), ak.songtypes_sortable DESC, ak.songorder, lower(unaccent(singers_sortable)), lower(unaccent(ak.title))
${limitClause}
${offsetClause}
`;

export const editBlacklistCriteria = `
UPDATE blacklist_criteria
SET type = :type,
	value = :value
WHERE pk_id_blcriteria = :id
`;

export const isBLCriteria = `
SELECT pk_id_blcriteria
FROM blacklist_criteria
WHERE pk_id_blcriteria = $1
`;

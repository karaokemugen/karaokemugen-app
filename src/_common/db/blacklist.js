// SQL for Blacklist management

export const emptyBlacklistCriterias = 'DELETE FROM blacklist_criteria;';

export const generateBlacklist = `DELETE FROM blacklist;
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
									INNER JOIN karasdb.tag t ON t.NORM_name LIKE ('%' || blc.value || '%')
									INNER JOIN karasdb.kara_tag kt ON t.pk_id_tag = kt.fk_id_tag
									INNER JOIN karasdb.kara k on k.pk_id_kara = kt.fk_id_kara
									WHERE blc.type = 0
									AND   kt.fk_id_kara NOT IN (select fk_id_kara from whitelist)
    								UNION    
								  SELECT k.pk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Series by name : ' ||  blc.value
									FROM blacklist_criteria blc
									INNER JOIN karasdb.kara k ON s.NORM_altname LIKE ('%' || blc.value || '%')
									INNER JOIN karasdb.serie s ON s.pk_id_serie = ks.fk_id_serie
									INNER JOIN karasdb.kara_serie ks ON ks.fk_id_kara = k.pk_id_kara
								  	WHERE blc.type = 1000
									AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
    								UNION    
								  SELECT CAST(blc.value AS INTEGER), k.kid, strftime('%s','now') ,'Blacklisted Song manually'
									FROM blacklist_criteria blc
									INNER JOIN karasdb.kara k ON k.pk_id_kara = blc.value
									WHERE blc.type = 1001
									AND   CAST(blc.value AS INTEGER) NOT IN (select 	fk_id_kara from whitelist)
    								UNION    
								  SELECT k.pk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Song longer than ' || blc.value || ' seconds'
									FROM blacklist_criteria blc
									INNER JOIN karasdb.kara k on k.duration >= blc.value
									WHERE blc.type = 1002
									AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
    								UNION    
								  SELECT k.pk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Song shorter than ' || blc.value || ' seconds'
									FROM blacklist_criteria blc
									INNER JOIN karasdb.kara k on k.duration <= blc.value
									WHERE blc.type = 1003
									AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
    							  	UNION    
								  SELECT k.pk_id_kara, k.kid, strftime('%s','now') ,'Blacklisted Title by name : ' ||  blc.value
									FROM blacklist_criteria blc
									INNER JOIN karasdb.kara k ON k.title LIKE ('%' || blc.value || '%')
									WHERE blc.type = 1004
									AND   k.pk_id_kara NOT IN (select fk_id_kara from whitelist)
									`;

export const getBlacklistCriterias = `SELECT pk_id_blcriteria AS blcriteria_id, 
											type, 
											value
									  FROM blacklist_criteria;`;

export const addBlacklistCriteria = `INSERT INTO blacklist_criteria(
										value,
										type,											
										uniquevalue)
     								VALUES ($blcvalue,$blctype,$blcuniquevalue);`;

export const deleteBlacklistCriteria = `DELETE FROM blacklist_criteria
    								WHERE pk_id_blcriteria = $id
									`;

export const getBlacklistContents = (filterClauses, lang) => `SELECT 
      									ak.kara_id AS kara_id,
      									ak.kid AS kid,
      									ak.title AS title,
      									ak.NORM_title AS NORM_title,
      									ak.songorder AS songorder,
      									COALESCE(
									  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
									  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
									  ak.serie) AS serie,
										COALESCE(
									  (SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
									  (SELECT sl.NORM_name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
									  ak.NORM_serie) AS NORM_serie,
									    ak.serie_altname AS serie_altname,
      									ak.NORM_serie_altname AS NORM_serie_altname,
										ak.serie_i18n AS serie_i18n,
      									ak.singer AS singer,
      									ak.NORM_singer AS NORM_singer,
      									ak.songtype AS songtype,      
      									ak.creator AS creator,
      									ak.NORM_creator AS NORM_creator,
      									ak.language AS language,
      									ak.author AS author,
      									ak.NORM_author AS NORM_author,
	  									ak.songwriter AS songwriter,
	  									ak.NORM_songwriter AS NORM_songwriter,
	  									ak.year AS year,
      									ak.misc AS misc,    
      									(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
										(SELECT COUNT(pk_id_request) AS request FROM request WHERE fk_id_kara = ak.kara_id) AS requested,
      									ak.duration AS duration,
      									bl.created_at AS created_at,
      									bl.reason AS reason_add,
      									ak.mediafile AS mediafile
 									FROM karasdb.all_karas AS ak 
									INNER JOIN blacklist AS bl ON bl.fk_id_kara = ak.kara_id
									WHERE 1 = 1
									${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
									ORDER BY ak.language, ak.serie IS NULL, ak.serie COLLATE NOCASE, ak.singer COLLATE NOCASE, ak.songtype DESC, ak.songorder, ak.title COLLATE NOCASE
									`;

export const editBlacklistCriteria = `UPDATE blacklist_criteria 
									SET type = $type,
    									value = $value
									WHERE pk_id_blcriteria = $id`;

export const isBLCriteria = `SELECT pk_id_blcriteria 
							FROM blacklist_criteria 
							WHERE pk_id_blcriteria = $id
							`;

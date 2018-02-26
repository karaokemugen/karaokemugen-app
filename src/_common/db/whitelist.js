// SQL for whitelist management

export const emptyWhitelist = 'DELETE FROM whitelist;';

export const getWhitelistContents = `SELECT wl.pk_id_whitelist AS whitelist_id, 
      									ak.kara_id AS kara_id,
      									ak.kid AS kid,
      									ak.title AS title,
      									ak.NORM_title AS NORM_title,
      									(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
      									ak.songorder AS songorder,
      									ak.serie AS serie,
      									ak.NORM_serie AS NORM_serie,
      									ak.serie_altname AS serie_altname,
      									ak.NORM_serie_altname AS NORM_serie_altname,
      									ak.singer AS singer,
      									ak.NORM_singer AS NORM_singer,
	  									ak.songwriter AS songwriter,
	  									ak.NORM_songwriter AS NORM_songwriter,
	  									ak.year AS year,
      									ak.songtype AS songtype,      
      									ak.creator AS creator,
      									ak.NORM_creator AS NORM_creator,
      									ak.language AS language,
      									ak.author AS author,
      									ak.NORM_author AS NORM_author,
      									ak.misc AS misc,    
      									ak.videolength AS duration,  
      									wl.created_at AS created_at,
      									ak.videofile AS videofile
 									FROM karasdb.all_karas AS ak 
									INNER JOIN whitelist AS wl ON wl.fk_id_kara = ak.kara_id
									ORDER BY ak.language, ak.serie IS NULL, ak.serie, ak.songtype, ak.songorder, ak.title;
									`;
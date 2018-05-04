// SQL for whitelist management

export const emptyWhitelist = 'DELETE FROM whitelist;';

export const getWhitelistContents = (filterClauses) => `SELECT wl.pk_id_whitelist AS whitelist_id, 
      									ak.kara_id AS kara_id,
      									ak.kid AS kid,
      									ak.title AS title,
      									(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
      									ak.songorder AS songorder,
      									ak.serie AS serie,
      									ak.serie_altname AS serie_altname,
      									ak.singer AS singer,
      									ak.songwriter AS songwriter,
	  									ak.year AS year,
      									ak.songtype AS songtype,      
      									ak.creator AS creator,
      									ak.language AS language,
      									ak.author AS author,
      									ak.misc AS misc,    
      									ak.duration AS duration,  
      									wl.created_at AS created_at,
      									ak.mediafile AS mediafile
 									FROM karasdb.all_karas AS ak 
									INNER JOIN whitelist AS wl ON wl.fk_id_kara = ak.kara_id
									WHERE 1 = 1
									${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
									ORDER BY ak.language, ak.serie IS NULL, ak.serie, ak.songtype, ak.songorder, ak.title
									LIMIT $size
									OFFSET $from
									`;

export const countWhitelist = (filterClauses) => `SELECT COUNT(*) as count
							FROM whitelist, karasdb.all_karas AS ak							
 							WHERE whitelist.fk_id_kara = ak.kara_id
 							${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
							`;
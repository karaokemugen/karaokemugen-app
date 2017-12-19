// SQL for main database operations

export const compareUUIDs = `SELECT db.value AS karasdb_uuid,
       							udb.value AS userdb_uuid
							FROM karasdb.settings AS db,
     							settings AS udb
							WHERE db.option = 'uuid' 
							  AND udb.option = 'uuid'
							`;

export const updateUUID = `UPDATE settings 
							SET value = $uuid 
							WHERE option = 'uuid';
							`;

export const calculateArtistCount = `SELECT COUNT(*) AS artistcount 
									FROM karasdb.tag 
									WHERE tagtype=2;
									`;

export const calculateKaraCount = `SELECT COUNT(*) AS karacount 
								  FROM karasdb.kara;
								  `;

export const calculateLangCount = `SELECT COUNT(*) AS langcount 
								  FROM karasdb.tag 
								  WHERE tagtype = 5;
								  `;

export const calculatePlaylistCount = `SELECT COUNT(*) AS plcount
								  FROM playlist
								  `;

export const calculateSeriesCount = `SELECT COUNT(*) AS seriescount 
								  FROM karasdb.serie;
								  `;

export const calculateDuration = `SELECT SUM(videolength) AS totalduration 
								 FROM karasdb.kara;
								`;
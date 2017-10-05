-- Up
ALTER TABLE blacklist_criteria ADD COLUMN uniquevalue TEXT

-- Down
CREATE TABLE tmp (
	pk_id_blcriteria	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	type	INTEGER NOT NULL,
	value	TEXT NOT NULL,	
);
INSERT INTO tmp SELECT pk_id_blcriteria,type,value FROM blacklist_criteria;
PRAGMA foreign_keys = "0";
DROP TABLE blacklist_criteria;
ALTER TABLE tmp RENAME TO blacklist_criteria;
PRAGMA foreign_keys;

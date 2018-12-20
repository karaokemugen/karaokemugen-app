-- Up
ALTER TABLE playlist ADD COLUMN time_left INTEGER;
UPDATE playlist SET time_left = 0;
CREATE TABLE tmp (
	pk_id_playlist	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name	TEXT NOT NULL,
	NORM_name	TEXT NOT NULL,
	num_karas	INTEGER NOT NULL,
	length	INTEGER NOT NULL,
	created_at	INTEGER NOT NULL,
	modified_at	INTEGER NOT NULL,
	flag_visible	INTEGER NOT NULL,
	flag_current	INTEGER NOT NULL,
	flag_public	INTEGER NOT NULL,
	time_left	INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_playlist,name,NORM_name,num_karas,length,created_at,modified_at,flag_visible,flag_current,flag_public,time_left FROM playlist;
PRAGMA foreign_keys = "0";
DROP TABLE playlist;
ALTER TABLE tmp RENAME TO playlist;
PRAGMA foreign_keys;

-- Down
CREATE TABLE tmp (
	pk_id_playlist	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name	TEXT NOT NULL,
	NORM_name	TEXT NOT NULL,
	num_karas	INTEGER NOT NULL,
	length	INTEGER NOT NULL,
	created_at	INTEGER NOT NULL,
	modified_at	INTEGER NOT NULL,
	flag_visible	INTEGER NOT NULL,
	flag_current	INTEGER NOT NULL,
	flag_public	INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_playlist,name,NORM_name,num_karas,length,created_at,modified_at,flag_visible,flag_current,flag_public FROM playlist;
PRAGMA foreign_keys = "0";
DROP TABLE playlist;
ALTER TABLE tmp RENAME TO playlist;
PRAGMA foreign_keys;
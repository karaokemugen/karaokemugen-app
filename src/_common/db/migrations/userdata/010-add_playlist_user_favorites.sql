-- Up

CREATE TABLE tmp (
	pk_id_playlist	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name	TEXT NOT NULL,
	NORM_name	TEXT NOT NULL,
	num_karas	INTEGER NOT NULL,
	length	INTEGER NOT NULL,
	created_at	INTEGER NOT NULL,
	modified_at	INTEGER NOT NULL,
	flag_visible INTEGER NOT NULL,
	flag_current INTEGER NOT NULL,
	flag_public	INTEGER NOT NULL,
	flag_favorites INTEGER NOT NULL,
	time_left	INTEGER NOT NULL,
	fk_id_user INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_playlist,name,NORM_NAME,num_karas,length,created_at,modified_at,flag_visible,flag_current,flag_public,0,time_left,0 FROM playlist;
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
	flag_public	INTEGER NOT NULL,	
	time_left	INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_playlist,name,NORM_NAME,num_karas,length,created_at,modified_at,flag_visible,flag_current,flag_public,time_left FROM playlist;
PRAGMA foreign_keys = "0";
DROP TABLE playlist;
ALTER TABLE tmp RENAME TO playlist;
PRAGMA foreign_keys;
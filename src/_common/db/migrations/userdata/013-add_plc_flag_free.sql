-- Up

CREATE TABLE tmp (
	pk_id_plcontent	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	fk_id_playlist	INTEGER NOT NULL,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	created_at	INTEGER NOT NULL,
	pos	REAL NOT NULL,
	flag_playing	INTEGER NOT NULL,
	pseudo_add        TEXT,
    NORM_pseudo_add   TEXT COLLATE NOCASE,
	fk_id_user INTEGER NOT NULL,
	flag_free INTEGER NOT NULL
);

INSERT INTO tmp SELECT pk_id_plcontent,fk_id_playlist,fk_id_kara,kid,created_at,pos,flag_playing,pseudo_add,NORM_pseudo_add,fk_id_user,0 FROM playlist_content;
PRAGMA foreign_keys = "0";
DROP TABLE playlist_content;
ALTER TABLE tmp RENAME TO playlist_content;
PRAGMA foreign_keys;

-- Down

CREATE TABLE tmp (
	pk_id_plcontent	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	fk_id_playlist	INTEGER NOT NULL,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	created_at	INTEGER NOT NULL,
	pos	REAL NOT NULL,
	flag_playing	INTEGER NOT NULL,
	pseudo_add        TEXT,
    NORM_pseudo_add   TEXT COLLATE NOCASE,
	fk_id_user INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_plcontent,fk_id_playlist,fk_id_kara,kid,created_at,pos,flag_playing,pseudo_add,NORM_pseudo_add,fk_id_user FROM playlist_content;
PRAGMA foreign_keys = "0";
DROP TABLE playlist_content;
ALTER TABLE tmp RENAME TO playlist_content;
PRAGMA foreign_keys;
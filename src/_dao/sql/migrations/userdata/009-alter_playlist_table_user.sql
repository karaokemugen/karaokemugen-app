-- Up

ALTER TABLE playlist_content ADD COLUMN fk_id_user INTEGER;

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
    NORM_pseudo_add   TEXT COLLATE NOCASE
);
INSERT INTO tmp SELECT pk_id_plcontent,fk_id_playlist,fk_id_kara,kid,created_at,pos,flag_playing,'Administrator','Administrator' FROM playlist_content;
PRAGMA foreign_keys = "0";
DROP TABLE playlist_content;
ALTER TABLE tmp RENAME TO playlist_content;
PRAGMA foreign_keys;
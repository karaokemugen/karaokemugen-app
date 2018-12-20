-- Up

CREATE TABLE tmp (
	pk_id_kara	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	kid	TEXT NOT NULL UNIQUE,
	title	TEXT,
	NORM_title	TEXT,
	year	TEXT,
	songorder	INTEGER DEFAULT (0),
	videofile	TEXT NOT NULL,
	videolength	INTEGER DEFAULT (0),
	gain	REAL DEFAULT (0),
	created_at	INTEGER NOT NULL,
	modified_at	INTEGER NOT NULL
);

INSERT INTO tmp SELECT pk_id_kara,kid,title,NORM_title,year,songorder,videofile,videolength,gain,created_at,modified_at FROM kara;
PRAGMA foreign_keys = "0";
DROP TABLE kara;
ALTER TABLE tmp RENAME TO kara;
PRAGMA foreign_keys;

CREATE TABLE tmp (
	pk_id_ass			 INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
	fk_id_kara           INTEGER NOT NULL REFERENCES kara,
	ass                  TEXT
);
INSERT INTO tmp SELECT pk_id_ass,fk_id_kara,ass FROM ass;
PRAGMA foreign_keys = "0";
DROP TABLE ass;
ALTER TABLE tmp RENAME TO ass;
PRAGMA foreign_keys;

-- Down

ALTER TABLE kara ADD COLUMN checksum TEXT;
ALTER TABLE ass ADD COLUMN checksum TEXT;
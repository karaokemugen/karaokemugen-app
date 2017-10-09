-- Up

ALTER TABLE ass ADD COLUMN checksum TEXT

-- Down

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

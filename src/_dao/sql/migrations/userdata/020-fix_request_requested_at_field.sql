-- Up

CREATE TABLE IF NOT EXISTS tmp (
	pk_id_request INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	fk_id_user	INTEGER NOT NULL REFERENCES user ON DELETE CASCADE,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	session_started_at INTEGER NOT NULL,
	requested_at INTEGER DEFAULT(0)
);
INSERT INTO tmp SELECT pk_id_request,fk_id_user,fk_id_kara,kid,session_started_at,requested_at FROM request;
PRAGMA foreign_keys = "0";
DROP TABLE request;
ALTER TABLE tmp RENAME TO request;
PRAGMA foreign_keys;

-- Down

CREATE TABLE IF NOT EXISTS tmp (
	pk_id_request INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	fk_id_user	INTEGER NOT NULL REFERENCES user ON DELETE CASCADE,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	session_started_at INTEGER NOT NULL,
	requested_at TEXT DEFAULT(0)
);
INSERT INTO tmp SELECT pk_id_request,fk_id_user,fk_id_kara,kid,session_started_at,requested_at FROM request;
PRAGMA foreign_keys = "0";
DROP TABLE request;
ALTER TABLE tmp RENAME TO request;
PRAGMA foreign_keys;
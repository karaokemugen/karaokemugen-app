-- Up

CREATE TABLE IF NOT EXISTS tmp (
	pk_id_request INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	fk_id_user	INTEGER NOT NULL REFERENCES user ON DELETE CASCADE,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	session_started_at INTEGER NOT NULL,
	requested_at TEXT DEFAULT(0)
);
INSERT INTO tmp SELECT pk_id_request,fk_id_user,fk_id_kara,kid,0,requested_at FROM request;
PRAGMA foreign_keys = "0";
DROP TABLE request;
ALTER TABLE tmp RENAME TO request;
PRAGMA foreign_keys;

CREATE TABLE IF NOT EXISTS tmp  (
    pk_id_viewcount   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
	session_started_at INTEGER NOT NULL,
    modified_at       INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_viewcount,fk_id_kara,kid,0,modified_at FROM viewcount;
PRAGMA foreign_keys = "0";
DROP TABLE viewcount;
ALTER TABLE tmp RENAME TO viewcount;
PRAGMA foreign_keys;

-- Down

CREATE TABLE IF NOT EXISTS tmp (
	pk_id_request INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	fk_id_user	INTEGER NOT NULL REFERENCES user ON DELETE CASCADE,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	requested_at TEXT DEFAULT(0)
);
INSERT INTO tmp SELECT pk_id_request,fk_id_user,fk_id_kara,kid,requested_at FROM request;
PRAGMA foreign_keys = "0";
DROP TABLE request;
ALTER TABLE tmp RENAME TO request;
PRAGMA foreign_keys;

CREATE TABLE IF NOT EXISTS tmp  (
    pk_id_viewcount   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
	modified_at       INTEGER NOT NULL
);
INSERT INTO tmp SELECT pk_id_viewcount,fk_id_kara,kid,modified_at FROM viewcount;
PRAGMA foreign_keys = "0";
DROP TABLE viewcount;
ALTER TABLE tmp RENAME TO viewcount;
PRAGMA foreign_keys;
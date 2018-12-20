-- Up
CREATE TABLE tmp (
    pk_id_whitelist   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
    created_at        INTEGER NOT NULL   
);
INSERT INTO tmp SELECT pk_id_whitelist,fk_id_kara,kid,created_at FROM whitelist;
PRAGMA foreign_keys = "0";
DROP TABLE whitelist;
ALTER TABLE tmp RENAME TO whitelist;
PRAGMA foreign_keys;

-- Down
ALTER TABLE whitelist ADD COLUMN reason TEXT NOT NULL DEFAULT '';
-- Up

DROP TABLE favorites;

-- Down

CREATE TABLE IF NOT EXISTS favorites (
	fk_id_user	INTEGER NOT NULL,
	fk_id_kara	INTEGER NOT NULL,
	kid	TEXT NOT NULL,
	duration	INTEGER NOT NULL DEFAULT 0
);

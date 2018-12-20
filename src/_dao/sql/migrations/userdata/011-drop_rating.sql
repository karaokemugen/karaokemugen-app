-- Up

DROP TABLE `rating`;

-- Down

CREATE TABLE IF NOT EXISTS rating (
    pk_id_rating   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara     INTEGER NOT NULL,
    kid            TEXT NOT NULL,
    rating         INTEGER NOT NULL,
    modified_at    INTEGER NOT NULL
);

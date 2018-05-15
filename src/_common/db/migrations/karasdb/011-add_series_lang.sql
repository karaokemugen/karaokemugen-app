-- Up

CREATE TABLE serie_lang (
    pk_id_serie_lang    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
    fk_id_serie    INTEGER NOT NULL,
    lang    TEXT NOT NULL,
    name    TEXT NOT NULL,
    NORM_name    TEXT NOT NULL
);

-- Down

DROP TABLE serie_lang;
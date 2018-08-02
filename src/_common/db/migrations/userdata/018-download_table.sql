-- Up

CREATE TABLE download (
	pk_id_download	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	uuid    TEXT NOT NULL,
	name	TEXT NOT NULL,
	urls	TEXT NOT NULL,
	size	INTEGER NOT NULL DEFAULT 0,
	status	TEXT NOT NULL DEFAULT 'DL_PLANNED'
);

CREATE INDEX index_download_uuid ON download (
	uuid
);

-- Down

DROP INDEX index_download_uuid;
DROP TABLE download;

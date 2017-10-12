-- Up

CREATE TABLE IF NOT EXISTS settings (
	option               TEXT,
	value                TEXT
);

INSERT INTO settings(option,value) VALUES('uuid',null);

-- Down

DROP TABLE settings;
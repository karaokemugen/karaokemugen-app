CREATE TABLE download_blacklist_criteria (
	pk_id_dl_blcriteria SERIAL PRIMARY KEY,
	type INTEGER NOT NULL,
	value CHARACTER VARYING NOT NULL
);

CREATE UNIQUE INDEX idx_dlblc_type_value ON download_blacklist_criteria(type, value);
-- Up

CREATE INDEX index_serie_lang_fk_id_serie ON serie_lang (
	fk_id_serie
);

-- Down

DROP INDEX index_serie_lang_fk_id_serie;
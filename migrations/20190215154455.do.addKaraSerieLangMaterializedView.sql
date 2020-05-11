CREATE MATERIALIZED VIEW all_kara_serie_langs AS
	SELECT sl.name, sl.lang, ks.fk_kid AS kid
	FROM serie_lang sl
	INNER JOIN kara_serie ks ON sl.fk_sid = ks.fk_sid;

CREATE INDEX idx_akls_kid_lang ON all_kara_serie_langs(kid, lang);
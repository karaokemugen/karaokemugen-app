import { LangClause } from "../../types/database";

// SQL for series

export const getSeriesByName = `
SELECT
	name,
	pk_sid AS sid
FROM serie
WHERE name = :name
;`;

export const getSeries = (filterClauses: string[], lang: LangClause, limitClause: string, offsetClause: string) => `
SELECT
	aseries.name AS name,
	COALESCE(
		(SELECT array_to_string (array_agg(sl.name), ', ') FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.main}),
		(SELECT array_to_string (array_agg(sl.name), ', ') FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.fallback}),
		aseries.name)
	AS i18n_name,
	aseries.aliases AS aliases,
	aseries.sid AS sid,
	aseries.i18n AS i18n,
	aseries.search AS search,
	aseries.seriefile AS seriefile,
	aseries.karacount::integer AS karacount,
	aseries.repository AS repository
FROM all_series aseries
WHERE 1 = 1
	${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY i18n_name
${limitClause}
${offsetClause}
`;

export const getSerieByID = (lang: LangClause) => `
SELECT
	aseries.name AS name,
	COALESCE(
		(SELECT array_to_string (array_agg(sl.name), ', ') FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.main}),
		(SELECT array_to_string (array_agg(sl.name), ', ') FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.fallback}),
		aseries.name)
	AS i18n_name,
	aseries.aliases AS aliases,
	aseries.sid AS sid,
	aseries.i18n AS i18n,
	aseries.search AS search,
	aseries.seriefile AS seriefile,
	aseries.karacount::integer AS karacount,
	aseries.repository AS repository
FROM all_series aseries
WHERE sid = $1;
`;

export const insertSerie = `
INSERT INTO serie(
	name,
	aliases,
	pk_sid,
	seriefile,
	repository
)
VALUES(
	:name,
	:aliases,
	:sid,
	:seriefile,
	:repository
)
`;

export const updateSerie = `
UPDATE serie
SET
	name = :name,
	aliases = :aliases,
	seriefile = :seriefile,
	repository = :repository
WHERE pk_sid = :sid;
`;

export const deleteSeriesByKara = `
DELETE FROM kara_serie
WHERE fk_kid = $1
`;

export const insertKaraSeries = `
INSERT INTO kara_serie(fk_kid,fk_sid)
VALUES(:kid, :sid);
`;

export const insertSeriei18n = `
INSERT INTO serie_lang(
	fk_sid,
	lang,
	name
)
VALUES(
	:sid,
	:lang,
	:name
);
`;

export const deleteSeries = 'DELETE FROM serie WHERE pk_sid = $1';

export const deleteSeriesi18n = 'DELETE FROM serie_lang WHERE fk_sid = $1';

export const testSerie = 'SELECT seriefile, name FROM serie WHERE pk_sid = $1';
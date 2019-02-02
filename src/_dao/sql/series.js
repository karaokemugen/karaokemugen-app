// SQL for series

export const getSeriesByName = `
SELECT
	name
FROM aseries
WHERE name = :name
;`;
export const getSeries = (filterClauses, lang, limitClause, offsetClause) => `
SELECT
	aseries.name AS name,
	COALESCE(
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.main}),
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.fallback}),
		aseries.name)
	AS i18n_name,
	aseries.aliases AS aliases,
	aseries.sid AS sid,
	aseries.i18n AS i18n,
	aseries.search AS search,
	aseries.seriefile AS seriefile,
	aseries.karacount::integer AS karacount
FROM all_series aseries
WHERE 1 = 1
	${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
ORDER BY i18n_name
${limitClause}
${offsetClause}
`;

export const getSerieByID = (lang) => `
SELECT
	aseries.name AS name,
	COALESCE(
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.main}),
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_sid = aseries.sid AND sl.lang = ${lang.fallback}),
		aseries.name)
	AS i18n_name,
	aseries.aliases AS aliases,
	aseries.sid AS sid,
	aseries.i18n AS i18n,
	aseries.search AS search,
	aseries.seriefile AS seriefile,
	aseries.karacount::integer AS karacount
FROM all_series aseries
WHERE sid = $1;
`;

export const insertSerie = `
INSERT INTO serie(
	name,
	aliases,
	sid,
	seriefile
)
VALUES(
	:name,
	:aliases,
	:sid,
	:seriefile
)
`;

export const updateSerie = `
UPDATE serie
SET
	name = :name,
	aliases = :aliases,
	seriefile = :seriefile
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
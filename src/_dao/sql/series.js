// SQL for series

export const getSeries = (filterClauses, lang, limitClause, offsetClause) => `
SELECT aseries.serie_id AS serie_id,
	aseries.name AS name,
	COALESCE(
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = aseries.serie_id AND sl.lang = ${lang.main}),
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = aseries.serie_id AND sl.lang = ${lang.fallback}),
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
SELECT aseries.serie_id AS serie_id,
	aseries.name AS name,
	COALESCE(
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = aseries.serie_id AND sl.lang = ${lang.main}),
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = aseries.serie_id AND sl.lang = ${lang.fallback}),
		aseries.name)
	AS i18n_name,
	aseries.aliases AS aliases,
	aseries.sid AS sid,
	aseries.i18n AS i18n,
	aseries.search AS search,
	aseries.seriefile AS seriefile,
	aseries.karacount::integer AS karacount
FROM all_series aseries
WHERE serie_id = $1;
`;


export const getSerieByName = `
SELECT pk_id_serie AS serie_id
FROM serie
WHERE name = :name
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
) RETURNING *
`;

export const updateSerie = `
UPDATE serie
SET
	name = :name,
	aliases = :aliases,
	seriefile = :seriefile
WHERE pk_id_serie = :serie_id;
`;

export const deleteSeriesByKara = `
DELETE FROM kara_serie
WHERE fk_id_kara = $1
`;

export const insertKaraSeries = `
INSERT INTO kara_serie(fk_id_kara,fk_id_serie)
VALUES(:kara_id, :serie_id);
`;

export const insertSeriei18n = `
INSERT INTO karasdb.serie_lang(
	fk_id_serie,
	lang,
	name
)
VALUES(
	:id_serie,
	:lang,
	:name
);
`;

export const deleteSeries = 'DELETE FROM serie WHERE pk_id_serie = $1';

export const deleteSeriesi18n = 'DELETE FROM serie_lang WHERE fk_id_serie = $1';
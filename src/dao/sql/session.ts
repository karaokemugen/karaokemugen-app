export const selectSessions = `
SELECT pk_seid AS seid,
	name,
	started_at,
	COUNT(p.fk_kid) AS played,
	COUNT(r.fk_kid) AS requested
FROM session
LEFT JOIN played p ON p.fk_seid = pk_seid
LEFT JOIN requested r on r.fk_seid = pk_seid
GROUP BY pk_seid
ORDER BY started_at DESC
`;

export const insertSession = `
INSERT INTO session(pk_seid, name, started_at) VALUES(
	$1,
	$2,
	$3
)
`;

export const replacePlayed = `
UPDATE played SET
	fk_seid = $2
WHERE fk_seid = $1;
`;

export const replaceRequested = `
UPDATE requested SET
	fk_seid = $2
WHERE fk_seid = $1;
`;

export const updateSession = `
UPDATE session SET
	name = $2,
	started_at = $3
WHERE pk_seid = $1
`;

export const deleteSession = `
DELETE FROM session
WHERE pk_seid = $1
`;

export const cleanSessions = `
DELETE FROM session
WHERE (SELECT COUNT(fk_kid)::integer FROM played WHERE fk_seid = pk_seid) = 0
  AND (SELECT COUNT(fk_kid)::integer FROM requested WHERE fk_seid = pk_seid) = 0
`
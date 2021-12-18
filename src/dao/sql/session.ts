export const sqlselectSessions = `
SELECT pk_seid AS seid,
	name,
	started_at,
	ended_at,
	private,
	COUNT(p.fk_kid)::integer AS played,
	COUNT(r.fk_kid)::integer AS requested
FROM session
LEFT JOIN played p ON p.fk_seid = pk_seid
LEFT JOIN requested r on r.fk_seid = pk_seid
GROUP BY pk_seid
ORDER BY started_at DESC
`;

export const sqlinsertSession = `
INSERT INTO session(pk_seid, name, started_at, ended_at, private) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5
)
`;

export const sqlreplacePlayed = `
UPDATE played SET
	fk_seid = $2
WHERE fk_seid = $1;
`;

export const sqlreplaceRequested = `
UPDATE requested SET
	fk_seid = $2
WHERE fk_seid = $1;
`;

export const sqlupdateSession = `
UPDATE session SET
	name = $2,
	started_at = $3,
	ended_at = $4,
	private = $5
WHERE pk_seid = $1
`;

export const sqldeleteSession = `
DELETE FROM session
WHERE pk_seid = $1
`;

export const sqlcleanSessions = `
DELETE FROM session
WHERE (SELECT COUNT(fk_kid)::integer FROM played WHERE fk_seid = pk_seid) = 0
  AND (SELECT COUNT(fk_kid)::integer FROM requested WHERE fk_seid = pk_seid) = 0
`;

export const sqlAutoFillSessionEndedAt = `
UPDATE session
SET ended_at = (
	SELECT p.played_at + (k.duration * '1 second'::interval) AS last_played
	FROM played p
	LEFT JOIN kara k ON k.pk_kid = p.fk_kid
	WHERE p.fk_seid = pk_seid
	ORDER BY p.played_at DESC
	LIMIT 1
	)
WHERE ended_at IS NULL
  AND pk_seid != $1
`;

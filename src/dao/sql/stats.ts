// SQL for stats

export const sqlexportPlayed = `
SELECT p.fk_kid AS kid,
	p.fk_seid AS seid,
	p.played_at
FROM played p, session s
WHERE s.pk_seid = p.fk_seid
  AND s.private = FALSE;
`;

export const sqlexportRequested = `
SELECT r.fk_kid AS kid,
	r.fk_seid AS seid,
	r.requested_at
FROM requested r, session s
WHERE s.pk_seid = r.fk_seid
  AND s.private = FALSE;
`;
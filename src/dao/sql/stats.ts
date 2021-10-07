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
	r.requested_at,
	r.fk_login AS username
FROM requested r
LEFT JOIN session s ON s.pk_seid = r.fk_seid
LEFT JOIN users u ON u.pk_login = r.fk_login
WHERE s.private = FALSE
  AND u.flag_sendstats = TRUE;
`;

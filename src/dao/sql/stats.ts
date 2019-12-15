// SQL for stats

export const exportPlayed = `
SELECT p.fk_kid AS kid,
	p.fk_seid AS seid,
	p.played_at
FROM played p, session s
WHERE s.pk_seid = p.fk_seid
  AND s.private = FALSE;
`;

export const exportRequested = `
SELECT r.fk_kid AS kid,
	r.fk_seid AS seid,
	r.requested_at
FROM requested r, session s
WHERE s.pk_seid = r.fk_seid
  AND s.private = FALSE;
`;

export const exportFavorites = `
SELECT f.fk_kid AS kid
FROM favorites f
WHERE f.fk_login NOT LIKE '%@%';
`;
ALTER TABLE played ADD COLUMN session_started_at TIMESTAMPTZ;
ALTER TABLE requested ADD COLUMN session_started_at TIMESTAMPTZ;

UPDATE played SET session_started_at = (SELECT started_at FROM session where pk_seid = fk_seid);
UPDATE requested SET session_started_at = (SELECT started_at FROM session where pk_seid = fk_seid);

ALTER TABLE played DROP COLUMN fk_seid;
ALTER TABLE requested DROP COLUMN fk_seid;

DROP TABLE session;

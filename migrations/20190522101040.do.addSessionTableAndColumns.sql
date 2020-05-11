CREATE TABLE session (
	pk_seid UUID,
	name CHARACTER VARYING,
	started_at TIMESTAMPTZ UNIQUE NOT NULL
);

INSERT INTO session (started_at)
SELECT DISTINCT session_started_at FROM played;

INSERT INTO session (started_at)
SELECT DISTINCT session_started_at FROM requested
ON CONFLICT DO NOTHING;

UPDATE session SET name = started_at;

UPDATE session SET pk_seid = (SELECT uuid_in(overlay(overlay(md5(random()::text || ':' || started_at::text) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring));

ALTER TABLE session ADD PRIMARY KEY(pk_seid);

ALTER TABLE played ADD COLUMN fk_seid UUID;
ALTER TABLE requested ADD COLUMN fk_seid UUID;
ALTER TABLE played ADD CONSTRAINT played_fk_seid_fkey FOREIGN KEY (fk_seid) REFERENCES session (pk_seid) ON DELETE CASCADE;
ALTER TABLE requested ADD CONSTRAINT requested_fk_seid_fkey FOREIGN KEY (fk_seid) REFERENCES session (pk_seid) ON DELETE CASCADE;

UPDATE played SET fk_seid = (SELECT pk_seid FROM session WHERE started_at = session_started_at);
UPDATE requested SET fk_seid = (SELECT pk_seid FROM session WHERE started_at = session_started_at);

ALTER TABLE played DROP COLUMN session_started_at;
ALTER TABLE requested DROP COLUMN session_started_at;

ALTER TABLE session DROP CONSTRAINT session_started_at_key;
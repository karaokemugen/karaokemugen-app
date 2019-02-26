CREATE TYPE dlStatus AS ENUM ('DL_PLANNED', 'DL_RUNNING', 'DL_FAILED', 'DL_DONE');
CREATE TABLE download (
	pk_uuid    uuid NOT NULL PRIMARY KEY,
	name	character varying NOT NULL,
	urls	jsonb NOT NULL,
	size	integer NOT NULL DEFAULT 0,
	status	dlStatus NOT NULL DEFAULT 'DL_PLANNED',
	started_at timestamp NOT NULL DEFAULT now()
);


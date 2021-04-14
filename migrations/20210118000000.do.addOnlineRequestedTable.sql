CREATE TABLE online_requested (
	fk_kid uuid NOT NULL,
	requested integer DEFAULT(0)
);

CREATE INDEX idx_online_requested_kid ON online_requested (fk_kid);
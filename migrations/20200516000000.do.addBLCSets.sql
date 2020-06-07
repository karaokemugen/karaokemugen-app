CREATE TABLE blacklist_criteria_set (
	pk_id_blc_set	SERIAL PRIMARY KEY,
	name	CHARACTER VARYING NOT NULL,
	created_at	TIMESTAMPTZ NOT NULL,
	modified_at	TIMESTAMPTZ NOT NULL,
	flag_current	BOOLEAN DEFAULT FALSE
);

INSERT INTO blacklist_criteria_set(name, created_at, modified_at, flag_current) VALUES('Blacklist 1', NOW(), NOW(), true);

ALTER TABLE blacklist_criteria ADD COLUMN fk_id_blc_set INTEGER;
UPDATE blacklist_criteria SET fk_id_blc_set = 1;
ALTER TABLE blacklist_criteria ADD CONSTRAINT blc_id_blc_set_fk FOREIGN KEY (fk_id_blc_set) REFERENCES blacklist_criteria_set(pk_id_blc_set) ON DELETE CASCADE;
ALTER TABLE blacklist_criteria ALTER COLUMN fk_id_blc_set SET NOT NULL;

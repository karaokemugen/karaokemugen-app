ALTER TABLE blacklist_criteria DROP CONSTRAINT blc_id_blc_set_fk;
ALTER TABLE blacklist_criteria DROP COLUMN fk_id_blc_set;
DROP TABLE blacklist_criteria_set;
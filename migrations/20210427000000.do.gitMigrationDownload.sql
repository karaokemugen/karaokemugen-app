TRUNCATE TABLE download;
ALTER TABLE download DROP COLUMN kid;
ALTER TABLE download ADD COLUMN mediafile CHARACTER VARYING;

INSERT INTO blacklist_criteria(type, value, uniquevalue, fk_id_blc_set)
  SELECT db.type, db.value, db.uniquevalue, (SELECT pk_id_blc_set FROM blacklist_criteria_set WHERE flag_current = true) FROM download_blacklist_criteria db;

DROP TABLE download_blacklist_criteria;
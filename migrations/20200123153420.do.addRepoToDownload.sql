ALTER TABLE download ADD COLUMN repository CHARACTER VARYING;
UPDATE download SET repository = 'kara.moe';
ALTER TABLE download ALTER COLUMN repository SET NOT NULL;
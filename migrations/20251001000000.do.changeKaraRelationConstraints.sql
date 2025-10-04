ALTER TABLE kara_relation DROP CONSTRAINT kara_relation_fk_kid_parent_fkey;

ALTER TABLE kara_relation ALTER COLUMN fk_kid_parent SET DEFAUlT '00000000-0000-0000-0000-000000000000';
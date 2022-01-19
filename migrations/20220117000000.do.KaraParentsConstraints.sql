ALTER TABLE kara_relation DROP CONSTRAINT kara_relation_fk_kid_child_fkey;
ALTER TABLE kara_relation DROP CONSTRAINT kara_relation_fk_kid_parent_fkey;

ALTER TABLE kara_relation ADD CONSTRAINT kara_relation_fk_kid_child_fkey FOREIGN KEY(fk_kid_child) REFERENCES kara(pk_kid) ON DELETE CASCADE;
ALTER TABLE kara_relation ADD CONSTRAINT kara_relation_fk_kid_parent_fkey FOREIGN KEY(fk_kid_parent) REFERENCES kara(pk_kid) ON DELETE CASCADE;
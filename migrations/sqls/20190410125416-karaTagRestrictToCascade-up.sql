ALTER TABLE kara_tag DROP CONSTRAINT kara_tag_fk_id_tag_fkey;
ALTER TABLE kara_tag DROP CONSTRAINT kara_tag_fk_kid_fkey;
ALTER TABLE kara_tag ADD CONSTRAINT kara_tag_fk_id_tag_fkey FOREIGN KEY (fk_id_tag) REFERENCES tag(pk_id_tag) ON DELETE CASCADE;
ALTER TABLE kara_tag ADD CONSTRAINT kara_tag_fk_kid_fkey FOREIGN KEY (fk_kid) REFERENCES kara(pk_kid) ON DELETE CASCADE;
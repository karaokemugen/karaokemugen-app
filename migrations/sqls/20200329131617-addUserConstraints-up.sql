ALTER TABLE favorites DROP CONSTRAINT favorites_fk_login_fkey;

UPDATE favorites SET fk_login = COALESCE((SELECT u.pk_login FROM users u WHERE u.pk_login = fk_login), 'admin');
UPDATE playlist_content SET fk_login = COALESCE((SELECT u.pk_login FROM users u WHERE u.pk_login = fk_login), 'admin');
UPDATE requested SET fk_login = COALESCE((SELECT u.pk_login FROM users u WHERE u.pk_login = fk_login), 'admin');
UPDATE upvote SET fk_login = COALESCE((SELECT u.pk_login FROM users u WHERE u.pk_login = fk_login), 'admin');

ALTER TABLE favorites ADD CONSTRAINT favorites_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE playlist_content ADD CONSTRAINT plc_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON UPDATE CASCADE;
ALTER TABLE requested ADD CONSTRAINT requested_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON UPDATE CASCADE;
ALTER TABLE upvote ADD CONSTRAINT upvote_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE;
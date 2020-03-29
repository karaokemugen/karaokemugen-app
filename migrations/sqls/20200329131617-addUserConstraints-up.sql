ALTER TABLE favorites ADD CONSTRAINT favorites_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE playlist_content ADD CONSTRAINT plc_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON UPDATE CASCADE;
ALTER TABLE requested ADD CONSTRAINT requested_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON UPDATE CASCADE;
ALTER TABLE upvote ADD CONSTRAINT upvote_login_fkey FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE;
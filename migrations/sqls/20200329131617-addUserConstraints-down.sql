ALTER TABLE favorites DROP CONSTRAINT favorites_login_fkey;
ALTER TABLE playlist_content DROP CONSTRAINT plc_login_fkey;
ALTER TABLE requested DROP CONSTRAINT requested_login_fkey;
ALTER TABLE upvote DROP CONSTRAINT upvote_login_fkey;
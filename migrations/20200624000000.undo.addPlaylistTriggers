DROP TRIGGER playlist_only_one_current_trigger ON playlist;
DROP TRIGGER playlist_only_one_public_trigger ON playlist;

DROP FUNCTION ensure_only_one_enabled_current_trigger;
DROP FUNCTION ensure_only_one_enabled_public_trigger;

DROP INDEX playlist_flag_current_idx;
DROP INDEX playlist_flag_public_idx;

ALTER TABLE playlist DROP CONSTRAINT current_not_false;
ALTER TABLE playlist DROP CONSTRAINT public_not_false;

UPDATE playlist SET flag_current = null WHERE flag_current = false;
UPDATE playlist SET flag_public = null WHERE flag_public = false;
ALTER TABLE playlist ADD  CONSTRAINT current_not_false CHECK(flag_current != false);
ALTER TABLE playlist ADD  CONSTRAINT public_not_false CHECK(flag_public != false);
CREATE UNIQUE INDEX ON playlist USING btree(flag_current nulls LAST);
CREATE UNIQUE INDEX ON playlist USING btree(flag_public nulls LAST);

CREATE OR REPLACE FUNCTION ensure_only_one_enabled_public_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_public = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_public = null WHERE flag_public = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_public := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_only_one_enabled_current_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_current = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_current = null WHERE flag_current = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_current := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE TRIGGER playlist_only_one_public_trigger
BEFORE INSERT OR UPDATE OF flag_public ON playlist
FOR EACH ROW WHEN (NEW.flag_public = true)
EXECUTE PROCEDURE ensure_only_one_enabled_public_trigger();

CREATE TRIGGER playlist_only_one_current_trigger
BEFORE INSERT OR UPDATE OF flag_current ON playlist
FOR EACH ROW WHEN (NEW.flag_current = true)
EXECUTE PROCEDURE ensure_only_one_enabled_current_trigger();
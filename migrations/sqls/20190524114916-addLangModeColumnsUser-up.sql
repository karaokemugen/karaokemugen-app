ALTER TABLE users ADD COLUMN series_lang_mode INTEGER DEFAULT -1;
UPDATE users SET series_lang_mode = -1;
ALTER TABLE users ADD COLUMN main_series_lang CHARACTER VARYING;
ALTER TABLE users ADD COLUMN fallback_series_lang CHARACTER VARYING;
ALTER TABLE users ALTER COLUMN series_lang_mode SET NOT NULL;
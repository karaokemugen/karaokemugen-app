ALTER TABLE users ADD COLUMN series_lang_mode INTEGER DEFAULT -1;
UPDATE users SET series_lang_mode = -1;
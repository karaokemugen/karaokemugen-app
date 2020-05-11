UPDATE users SET nickname = pk_login WHERE nickname = NULL;
ALTER TABLE users ALTER COLUMN nickname SET NOT NULL;
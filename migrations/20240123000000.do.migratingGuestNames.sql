UPDATE users SET pk_login = lower(unaccent(pk_login))
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, ' ', '_')
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, '''', '')
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, '!', '')
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, '/', '_')
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, '<', '')
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, '?', '_')
WHERE type = 2;

UPDATE users SET pk_login = replace(pk_login, '"', '')
WHERE type = 2;
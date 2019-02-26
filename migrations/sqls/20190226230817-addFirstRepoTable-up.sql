CREATE TABLE repo (
	pk_repo_name CHARACTER VARYING NOT NULL PRIMARY KEY,
	last_downloaded_at TIMESTAMP
);

ALTER TABLE kara ADD COLUMN fk_repo_name CHARACTER VARYING;
UPDATE kara SET fk_repo_name = 'kara.moe';
ALTER TABLE kara ALTER COLUMN fk_repo_name SET NOT NULL;
CREATE TABLE IF NOT EXISTS all_karas_sortable (
	fk_kid UUID NOT NULL,
	titles TEXT,
	langs TEXT,
	songtypes TEXT,
	series_singergroups_singers TEXT
);

TRUNCATE all_karas_sortable CASCADE;

DO $$
    BEGIN
        IF EXISTS
            ( SELECT 1
              FROM   information_schema.tables
              WHERE  table_schema = 'public'
              AND    table_name = 'all_karas'
            )
        THEN
			INSERT INTO all_karas_sortable
            SELECT
              pk_kid,
			  titles_sortable,
			  languages_sortable,
			  songtypes_sortable,
			  serie_singergroup_singer_sortable
            FROM all_karas;
        END IF ;
    END
$$ ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_aks_kid
    ON all_karas_sortable(fk_kid);

CREATE INDEX IF NOT EXISTS idx_aks_series_singergroups_singers
    ON all_karas_sortable(series_singergroups_singers);

CREATE INDEX IF NOT EXISTS idx_aks_langs
    ON all_karas_sortable(langs);

CREATE INDEX IF NOT EXISTS idx_aks_titles
    ON all_karas_sortable(titles);

CREATE INDEX IF NOT EXISTS idx_aks_songtypes
    ON all_karas_sortable(songtypes);

ALTER TABLE IF EXISTS all_karas DROP COLUMN IF EXISTS titles_sortable;
ALTER TABLE IF EXISTS all_karas DROP COLUMN IF EXISTS languages_sortable;
ALTER TABLE IF EXISTS all_karas DROP COLUMN IF EXISTS songtypes_sortable;
ALTER TABLE IF EXISTS all_karas DROP COLUMN IF EXISTS serie_singergroup_singer_sortable;
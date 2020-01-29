

DROP MATERIALIZED VIEW all_tags;
CREATE MATERIALIZED VIEW all_tags AS
WITH t_count as (
    select a.fk_tid, json_agg(json_build_object('type', a.type, 'count', a.c))::text AS count_per_type
    FROM (
        SELECT fk_tid, count(fk_kid) as c, type
        FROM kara_tag
        GROUP BY fk_tid, type) as a
    GROUP BY a.fk_tid
)
SELECT
    t.name AS name,
    t.types AS types,
    t.aliases AS aliases,
    t.i18n AS i18n,
    t.pk_tid AS tid,
    tag_aliases.list AS search_aliases,
    t.tagfile AS tagfile,
    t.short as short,
    count_per_type::jsonb AS karacount
    FROM tag t
    CROSS JOIN LATERAL (
        SELECT string_agg(tag_aliases.elem::text, ' ') AS list
        FROM jsonb_array_elements_text(t.aliases) AS tag_aliases(elem)
    ) tag_aliases
    LEFT JOIN t_count on t.pk_tid = t_count.fk_tid
	GROUP BY t.pk_tid, tag_aliases.list, count_per_type
    ORDER BY name;

CREATE INDEX idx_at_name ON all_tags(name);
CREATE INDEX idx_at_tid ON all_tags(tid);
CREATE INDEX idx_at_search_aliases ON all_tags(search_aliases);

DROP MATERIALIZED VIEW all_series;
CREATE MATERIALIZED VIEW all_series AS
SELECT
	s.name AS name,
	s.aliases AS aliases,
	s.pk_sid AS sid,
	array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name))) as i18n,
	string_agg(sl.name, ' ') as search,
	series_aliases.list AS search_aliases,
	s.seriefile AS seriefile,
	(SELECT COUNT(ks.fk_kid) FROM kara_serie ks WHERE ks.fk_sid = s.pk_sid) AS karacount
	FROM serie s
	CROSS JOIN LATERAL (
		SELECT string_agg(series_aliases.elem::text, ' ') AS list
		FROM jsonb_array_elements_text(s.aliases) AS series_aliases(elem)
	) series_aliases
	LEFT JOIN serie_lang sl ON sl.fk_sid = s.pk_sid
	GROUP BY s.pk_sid, series_aliases.list
    ORDER BY name;

CREATE INDEX idx_as_name ON all_series(name);
CREATE INDEX idx_as_sid ON all_series(sid);
CREATE INDEX idx_as_search ON all_series(search);
CREATE INDEX idx_as_search_aliases ON all_series(search_aliases);

ALTER TABLE serie DROP COLUMN repository;
ALTER TABLE tag DROP COLUMN repository;
ALTER TABLE tag ADD COLUMN noLiveDownload BOOLEAN DEFAULT(false) NOT NULL;

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
	t.problematic AS problematic,
	t.noLiveDownload AS noLiveDownload,
    tag_aliases.list AS search_aliases,
    t.tagfile AS tagfile,
    t.short as short,
	t.repository AS repository,
	t.modified_at AS modified_at,
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


DROP MATERIALIZED VIEW all_tags;
CREATE MATERIALIZED VIEW all_tags AS
SELECT
	t.name AS name,
	t.types AS types,
	t.aliases AS aliases,
	t.i18n AS i18n,
	t.pk_tid AS tid,
	tag_aliases.list AS search_aliases,
	t.tagfile AS tagfile,
    t.short as short,
	COUNT(kt.fk_kid) AS karacount
	FROM tag t
	CROSS JOIN LATERAL (
		SELECT string_agg(tag_aliases.elem::text, ' ') AS list
		FROM jsonb_array_elements_text(t.aliases) AS tag_aliases(elem)
	) tag_aliases
	LEFT JOIN kara_tag kt ON kt.fk_tid = t.pk_tid
	GROUP BY t.pk_tid, tag_aliases.list
    ORDER BY name;
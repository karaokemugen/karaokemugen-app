DROP MATERIALIZED VIEW all_tags;

ALTER TABLE tag DROP COLUMN IF EXISTS problematic;

CREATE MATERIALIZED VIEW all_tags AS
WITH t_count AS (
    SELECT a.fk_tid,
           json_agg(json_build_object('type', a.type, 'count', a.c))::text AS count_per_type
    FROM (SELECT kara_tag.fk_tid,
                 count(kara_tag.fk_kid) AS c,
                 kara_tag.type
          FROM kara_tag
          GROUP BY kara_tag.fk_tid, kara_tag.type) a
    GROUP BY a.fk_tid
)

select t.*,
	t_count.count_per_type::jsonb AS karacount
from tag t
	LEFT JOIN t_count ON t.pk_tid = t_count.fk_tid;

CREATE UNIQUE INDEX idx_at_tid
    on all_tags (pk_tid);

DROP TABLE all_karas;
CREATE TABLE all_karas AS
SELECT k.*,
	 CASE WHEN MIN(kt.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', kt.pk_tid, 'short', kt.short, 'name', kt.name, 'aliases', kt.aliases, 'i18n', kt.i18n, 'priority', kt.priority, 'type_in_kara', ka.type, 'karafile_tag', kt.karafile_tag)::jsonb) END as tags,
	 tsvector_agg(kt.tag_search_vector) || k.title_search_vector AS search_vector,
	 CASE WHEN MIN(kt.pk_tid::text) IS NULL THEN ARRAY[]::text[] ELSE array_agg(DISTINCT kt.pk_tid::text || '~' || ka.type::text) END AS tid,
	 (select d.list
		from kara k2
		CROSS JOIN LATERAL (
			select string_agg(DISTINCT lower(unaccent(d.elem::text)),' ' ORDER BY lower(unaccent(d.elem::text))) AS list
			FROM jsonb_array_elements_text(jsonb_path_query_array( k.titles, '$.keyvalue().value')) AS d(elem)
		) d WHERE k2.pk_kid = k.pk_kid) AS titles_sortable,
  string_agg(DISTINCT lower(unaccent(tlang.name)), ' ' ORDER BY lower(unaccent(tlang.name))) AS languages_sortable,
  string_agg(DISTINCT lower(unaccent(tsongtype.name)), ' ' ORDER BY lower(unaccent(tsongtype.name))) AS songtypes_sortable,
  COALESCE(string_agg(DISTINCT lower(unaccent(tserie.name)), ' ' ORDER BY lower(unaccent(tserie.name))), string_agg(lower(unaccent(tsinger.name)), ', ' ORDER BY lower(unaccent(tsinger.name)))) AS serie_singer_sortable

FROM kara k

LEFT JOIN kara_tag ka on k.pk_kid = ka.fk_kid
LEFT JOIN tag kt on ka.fk_tid = kt.pk_tid

LEFT JOIN kara_tag kl on k.pk_kid = kl.fk_kid and kl.type = 5
LEFT JOIN tag tlang on kl.fk_tid = tlang.pk_tid

LEFT JOIN kara_tag ks on k.pk_kid = ks.fk_kid and ks.type = 1
LEFT JOIN tag tserie on ks.fk_tid = tserie.pk_tid

LEFT JOIN kara_tag s on k.pk_kid = s.fk_kid and s.type = 2
LEFT JOIN tag tsinger on s.fk_tid = tsinger.pk_tid

LEFT JOIN kara_tag ks2 on k.pk_kid = ks2.fk_kid and ks2.type = 3
LEFT JOIN tag tsongtype on ks2.fk_tid = tsongtype.pk_tid

GROUP BY k.pk_kid;

create index idx_ak_search_vector
    on all_karas using gin (search_vector);

create index idx_ak_created
    on all_karas (created_at desc);

create index idx_ak_songtypes
    on all_karas (songtypes_sortable desc);

create index idx_ak_songorder
    on all_karas (songorder);

create index idx_ak_title
    on all_karas (titles_sortable);

create index idx_ak_series_singers
    on all_karas (serie_singer_sortable);

create index idx_ak_language
    on all_karas (languages_sortable);

create index idx_ak_year
    on all_karas (year);

create UNIQUE index idx_ak_kid
    on all_karas (pk_kid);

UPDATE playlist_criteria SET type = 15 WHERE value = '95ca7fca-3a9e-4f24-be25-05e21261e26e' OR value = 'c973ea72-8a07-4f46-aca1-74f5db76dfff' OR value = 'af7e0dfb-751f-463a-ac56-e8d6979c2979';
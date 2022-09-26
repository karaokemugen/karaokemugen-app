DROP TABLE all_karas;
CREATE TABLE all_karas AS
SELECT k.*,
	array_agg(DISTINCT tserie.external_database_ids->>'anilist') AS anilist_ids,
	array_agg(DISTINCT tserie.external_database_ids->>'myanimelist') AS myanimelist_ids,
	array_agg(DISTINCT tserie.external_database_ids->>'kitsu') AS kitsu_ids,
	CASE WHEN MIN(kt.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object(
        'tid', kt.pk_tid,
        'short', kt.short,
        'name', kt.name,
        'aliases', kt.aliases,
        'i18n', kt.i18n,
        'priority', kt.priority,
        'type_in_kara', ka.type,
        'karafile_tag', kt.karafile_tag,
        'repository', kt.repository,
		'description', kt.description,
        'external_database_ids', kt.external_database_ids,
        'noLiveDownload', kt.nolivedownload
     )::jsonb) END as tags,
	 tsvector_agg(kt.tag_search_vector) || k.title_search_vector AS search_vector,
	 to_tsvector('') as search_vector_parents,
	 CASE WHEN MIN(kt.pk_tid::text) IS NULL THEN ARRAY[]::text[] ELSE array_agg(DISTINCT kt.pk_tid::text || '~' || ka.type::text) END AS tid,
	 CASE WHEN MIN(kt.external_database_ids::text) IS NULL THEN NULL ELSE array_agg(DISTINCT kt.external_database_ids) END AS external_database_ids,
	 (select d.list
		from kara k2
		CROSS JOIN LATERAL (
			select string_agg(DISTINCT lower(unaccent(d.elem::text)),' ' ORDER BY lower(unaccent(d.elem::text))) AS list
			FROM jsonb_array_elements_text(jsonb_path_query_array( k.titles, '$.keyvalue().value')) AS d(elem)
		) d WHERE k2.pk_kid = k.pk_kid) AS titles_sortable,
  string_agg(DISTINCT lower(unaccent(tlang.name)), ' ' ORDER BY lower(unaccent(tlang.name))) AS languages_sortable,
  string_agg(DISTINCT lower(unaccent(tsongtype.name)), ' ' ORDER BY lower(unaccent(tsongtype.name))) AS songtypes_sortable,
  COALESCE(
    string_agg(DISTINCT lower(unaccent(tserie.name)), ', ' ORDER BY lower(unaccent(tserie.name))),
    string_agg(DISTINCT lower(unaccent(tsingergroup.name)), ', ' ORDER BY lower(unaccent(tsingergroup.name))),
    string_agg(DISTINCT lower(unaccent(tsinger.name)), ', ' ORDER BY lower(unaccent(tsinger.name)))
  ) AS serie_singergroup_singer_sortable

FROM kara k

LEFT JOIN kara_tag ka on k.pk_kid = ka.fk_kid
LEFT JOIN tag kt on ka.fk_tid = kt.pk_tid

LEFT JOIN kara_tag kl on k.pk_kid = kl.fk_kid and kl.type = 5
LEFT JOIN tag tlang on kl.fk_tid = tlang.pk_tid

LEFT JOIN kara_tag ks on k.pk_kid = ks.fk_kid and ks.type = 1
LEFT JOIN tag tserie on ks.fk_tid = tserie.pk_tid

LEFT JOIN kara_tag s on k.pk_kid = s.fk_kid and s.type = 2
LEFT JOIN tag tsinger on s.fk_tid = tsinger.pk_tid

LEFT JOIN kara_tag sg on k.pk_kid = sg.fk_kid and sg.type = 17
LEFT JOIN tag tsingergroup on s.fk_tid = tsingergroup.pk_tid

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

create index idx_ak_series_singergroups_singers
    on all_karas (serie_singergroup_singer_sortable);

create index idx_ak_language
    on all_karas (languages_sortable);

create index idx_ak_year
    on all_karas (year);

create UNIQUE index idx_ak_kid
    on all_karas (pk_kid);

create index idx_ak_search_vector_parents
	on all_karas using gin (search_vector_parents);


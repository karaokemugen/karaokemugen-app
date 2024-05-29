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

create index idx_ak_anilist
	on all_karas (anilist_ids);

create index idx_ak_kitsu
	on all_karas (kitsu_ids);

create index idx_ak_myanimelist
	on all_karas (myanimelist_ids);

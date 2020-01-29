DROP MATERIALIZED VIEW all_karas;

ALTER TABLE kara RENAME COLUMN repository TO fk_repo_name;

CREATE MATERIALIZED VIEW all_karas AS
SELECT
  k.pk_kid AS kid,
  k.title,
  k.duration,
  k.gain,
  k.year,
  k.mediafile,
  k.subfile,
  k.created_at,
  k.modified_at,
  k.songorder,
  k.karafile,
  k.mediasize,
  aks.seriefiles AS seriefiles,
  aks.serie_altname AS serie_altname,
  aks.serie AS serie,
  aks.sid AS sid,
  akt.tid AS tid,
  akt.tags AS tags,
  akt.aliases AS tag_aliases,
  akt.tagfiles AS tagfiles,
  COALESCE(lower(unaccent(aks.serie)), lower(unaccent(singers.singers_sortable))) AS serie_singer_sortable,
  singers.singers AS singers,
  aks.serie_names AS serie_names,
  akt.tags_searchable AS tag_names,
  singers.singers_sortable AS singers_sortable,
  songtypes.songtypes AS songtypes,
  songtypes.songtypes_sortable AS songtypes_sortable,
  creators.creators AS creators,
  languages.languages AS languages,
  languages.languages_sortable AS languages_sortable,
  authors.authors AS authors,
  misc.misc AS misc,
  songwriters.songwriters AS songwriters,
  groups.groups AS groups,
  families.families AS families,
  genres.genres AS genres,
  platforms.platforms AS platforms,
  origins.origins AS origins,
  k.fk_repo_name AS repo
FROM kara k
LEFT JOIN all_kara_series aks ON k.pk_kid = aks.kid
LEFT JOIN all_kara_tag akt ON k.pk_kid = akt.kid
LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
LEFT JOIN tag t ON kt.fk_tid = t.pk_tid
LEFT OUTER JOIN singers on k.pk_kid = singers.fk_kid
LEFT OUTER JOIN songtypes on k.pk_kid = songtypes.fk_kid
LEFT OUTER JOIN creators on k.pk_kid = creators.fk_kid
LEFT OUTER JOIN languages on k.pk_kid = languages.fk_kid
LEFT OUTER JOIN authors on k.pk_kid = authors.fk_kid
LEFT OUTER JOIN misc on k.pk_kid = misc.fk_kid
LEFT OUTER JOIN songwriters on k.pk_kid = songwriters.fk_kid
LEFT OUTER JOIN groups on k.pk_kid = groups.fk_kid
LEFT OUTER JOIN families on k.pk_kid = families.fk_kid
LEFT OUTER JOIN origins on k.pk_kid = origins.fk_kid
LEFT OUTER JOIN genres on k.pk_kid = genres.fk_kid
LEFT OUTER JOIN platforms on k.pk_kid = platforms.fk_kid
GROUP BY k.pk_kid, languages_sortable, songtypes_sortable, singers_sortable, singers, songtypes, groups, songwriters, misc, authors, languages, creators, platforms, genres, origins, families, aks.seriefiles, aks.serie_orig, aks.serie_altname, aks.serie, aks.serie_names, aks.sid, akt.tid, akt.tags, akt.aliases, akt.tags_searchable, akt.tagfiles
ORDER BY languages_sortable, serie_singer_sortable, songtypes_sortable DESC, songorder;

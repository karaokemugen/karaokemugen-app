DROP MATERIALIZED VIEW all_karas;

CREATE TABLE all_karas AS
SELECT k.*,
  CASE WHEN MIN(tauthor.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tauthor.pk_tid, 'short', tauthor.short, 'name', tauthor.name, 'problematic', tauthor.problematic, 'aliases', tauthor.aliases, 'i18n', tauthor.i18n)::jsonb) END as authors,
  CASE WHEN MIN(tcreator.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tcreator.pk_tid, 'short', tcreator.short, 'name', tcreator.name, 'problematic', tcreator.problematic, 'aliases', tcreator.aliases, 'i18n', tcreator.i18n)::jsonb) END as creators,
  CASE WHEN MIN(tfamily.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tfamily.pk_tid, 'short', tfamily.short, 'name', tfamily.name, 'problematic', tfamily.problematic, 'aliases', tfamily.aliases, 'i18n', tfamily.i18n)::jsonb) END as families,
  CASE WHEN MIN(tgenre.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tgenre.pk_tid, 'short', tgenre.short, 'name', tgenre.name, 'problematic', tgenre.problematic, 'aliases', tgenre.aliases, 'i18n', tgenre.i18n)::jsonb) END as genres,
  CASE WHEN MIN(tgroup.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tgroup.pk_tid, 'short', tgroup.short, 'name', tgroup.name, 'problematic', tgroup.problematic, 'aliases', tgroup.aliases, 'i18n', tgroup.i18n)::jsonb) END as groups,
  CASE WHEN MIN(tlang.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tlang.pk_tid, 'short', tlang.short, 'name', tlang.name, 'problematic', tlang.problematic, 'aliases', tlang.aliases, 'i18n', tlang.i18n)::jsonb) END as languages,
  CASE WHEN MIN(tmisc.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tmisc.pk_tid, 'short', tmisc.short, 'name', tmisc.name, 'problematic', tmisc.problematic, 'aliases', tmisc.aliases, 'i18n', tmisc.i18n)::jsonb) END as misc,
  CASE WHEN MIN(torigin.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', torigin.pk_tid, 'short', torigin.short, 'name', torigin.name, 'problematic', torigin.problematic, 'aliases', torigin.aliases, 'i18n', torigin.i18n)::jsonb) END as origins,
  CASE WHEN MIN(tplatform.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tplatform.pk_tid, 'short', tplatform.short, 'name', tplatform.name, 'problematic', tplatform.problematic, 'aliases', tplatform.aliases, 'i18n', tplatform.i18n)::jsonb) END as platforms,
  CASE WHEN MIN(tserie.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tserie.pk_tid, 'short', tserie.short, 'name', tserie.name, 'problematic', tserie.problematic, 'aliases', tserie.aliases, 'i18n', tserie.i18n)::jsonb) END as series,
  CASE WHEN MIN(tsinger.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tsinger.pk_tid, 'short', tsinger.short, 'name', tsinger.name, 'problematic', tsinger.problematic, 'aliases', tsinger.aliases, 'i18n', tsinger.i18n)::jsonb) END as singers,
  CASE WHEN MIN(tsongtype.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tsongtype.pk_tid, 'short', tsongtype.short, 'name', tsongtype.name, 'problematic', tsongtype.problematic, 'aliases', tsongtype.aliases, 'i18n', tsongtype.i18n)::jsonb) END as songtypes,
  CASE WHEN MIN(tsongwriter.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tsongwriter.pk_tid, 'short', tsongwriter.short, 'name', tsongwriter.name, 'problematic', tsongwriter.problematic, 'aliases', tsongwriter.aliases, 'i18n', tsongwriter.i18n)::jsonb) END as songwriters,
  CASE WHEN MIN(tversion.pk_tid::text) IS NULL THEN null ELSE jsonb_agg(DISTINCT json_build_object('tid', tversion.pk_tid, 'short', tversion.short, 'name', tversion.name, 'problematic', tversion.problematic, 'aliases', tversion.aliases, 'i18n', tversion.i18n)::jsonb) END as versions,
  string_agg(lower(unaccent(tlang.name)), ', ' ORDER BY tlang.name) AS languages_sortable,
  string_agg(lower(unaccent(tsongtype.name)), ', ' ORDER BY tsongtype.name) AS songtypes_sortable,
  COALESCE(string_agg(lower(unaccent(tserie.name)), ', ' ORDER BY tserie.name), string_agg(lower(unaccent(tsinger.name)), ', ' ORDER BY tsinger.name)) AS serie_singer_sortable,
  tsvector_agg(tauthor.tag_search_vector) ||
	tsvector_agg(tcreator.tag_search_vector) ||
	tsvector_agg(tfamily.tag_search_vector) ||
	tsvector_agg(tgenre.tag_search_vector) ||
	tsvector_agg(tgroup.tag_search_vector) ||
	tsvector_agg(tlang.tag_search_vector) ||
	tsvector_agg(tmisc.tag_search_vector) ||
	tsvector_agg(torigin.tag_search_vector) ||
	tsvector_agg(tplatform.tag_search_vector) ||
	tsvector_agg(tserie.tag_search_vector) ||
	tsvector_agg(tsinger.tag_search_vector) ||
	tsvector_agg(tsongtype.tag_search_vector) ||
	tsvector_agg(tsongwriter.tag_search_vector) ||
	tsvector_agg(tversion.tag_search_vector) ||
	k.title_search_vector AS search_vector,
  array_agg(DISTINCT tauthor.tagfile) ||
    array_agg(DISTINCT tcreator.tagfile) ||
    array_agg(DISTINCT tfamily.tagfile) ||
    array_agg(DISTINCT tgenre.tagfile) ||
    array_agg(DISTINCT tgroup.tagfile) ||
    array_agg(DISTINCT tlang.tagfile) ||
    array_agg(DISTINCT tmisc.tagfile) ||
    array_agg(DISTINCT torigin.tagfile) ||
    array_agg(DISTINCT tplatform.tagfile) ||
    array_agg(DISTINCT tserie.tagfile) ||
    array_agg(DISTINCT tsinger.tagfile) ||
    array_agg(DISTINCT tsongtype.tagfile) ||
    array_agg(DISTINCT tsongwriter.tagfile) ||
    array_agg(DISTINCT tversion.tagfile) AS tagfiles,
  array_agg(DISTINCT tauthor.pk_tid::text || '~6') ||
    array_agg(DISTINCT tcreator.pk_tid::text || '~4') ||
    array_agg(DISTINCT tfamily.pk_tid::text || '~10') ||
    array_agg(DISTINCT tgenre.pk_tid::text || '~12') ||
    array_agg(DISTINCT tgroup.pk_tid::text || '~9') ||
    array_agg(DISTINCT tlang.pk_tid::text || '~5') ||
    array_agg(DISTINCT tmisc.pk_tid::text || '~7') ||
    array_agg(DISTINCT torigin.pk_tid::text || '~11') ||
    array_agg(DISTINCT tplatform.pk_tid::text || '~13') ||
    array_agg(DISTINCT tserie.pk_tid::text || '~1') ||
    array_agg(DISTINCT tsinger.pk_tid::text || '~2') ||
    array_agg(DISTINCT tsongtype.pk_tid::text || '~3') ||
    array_agg(DISTINCT tsongwriter.pk_tid::text || '~8') ||
    array_agg(DISTINCT tversion.pk_tid::text || '~14' ) AS tid

FROM kara k

LEFT JOIN kara_tag ka on k.pk_kid = ka.fk_kid and ka.type = 6
LEFT JOIN tag tauthor on ka.fk_tid = tauthor.pk_tid

LEFT JOIN kara_tag kc on k.pk_kid = kc.fk_kid and kc.type = 4
LEFT JOIN tag tcreator on kc.fk_tid = tcreator.pk_tid

LEFT JOIN kara_tag kf on k.pk_kid = kf.fk_kid and kf.type = 10
LEFT JOIN tag tfamily on kf.fk_tid = tfamily.pk_tid

LEFT JOIN kara_tag kg on k.pk_kid = kg.fk_kid and kg.type = 12
LEFT JOIN tag tgenre on kg.fk_tid = tgenre.pk_tid

LEFT JOIN kara_tag g on k.pk_kid = g.fk_kid and g.type = 9
LEFT JOIN tag tgroup on g.fk_tid = tgroup.pk_tid

LEFT JOIN kara_tag kl on k.pk_kid = kl.fk_kid and kl.type = 5
LEFT JOIN tag tlang on kl.fk_tid = tlang.pk_tid

LEFT JOIN kara_tag km on k.pk_kid = km.fk_kid and km.type = 7
LEFT JOIN tag tmisc on km.fk_tid = tmisc.pk_tid

LEFT JOIN kara_tag ko on k.pk_kid = ko.fk_kid and ko.type = 11
LEFT JOIN tag torigin on ko.fk_tid = torigin.pk_tid

LEFT JOIN kara_tag kp on k.pk_kid = kp.fk_kid and kp.type = 13
LEFT JOIN tag tplatform on kp.fk_tid = tplatform.pk_tid

LEFT JOIN kara_tag ks on k.pk_kid = ks.fk_kid and ks.type = 1
LEFT JOIN tag tserie on ks.fk_tid = tserie.pk_tid

LEFT JOIN kara_tag s on k.pk_kid = s.fk_kid and s.type = 2
LEFT JOIN tag tsinger on s.fk_tid = tsinger.pk_tid

LEFT JOIN kara_tag ks2 on k.pk_kid = ks2.fk_kid and ks2.type = 3
LEFT JOIN tag tsongtype on ks2.fk_tid = tsongtype.pk_tid

LEFT JOIN kara_tag ks3 on k.pk_kid = ks3.fk_kid and ks3.type = 8
LEFT JOIN tag tsongwriter on ks3.fk_tid = tsongwriter.pk_tid

LEFT JOIN kara_tag kv on k.pk_kid = kv.fk_kid and kv.type = 14
LEFT JOIN tag tversion on kv.fk_tid = tversion.pk_tid
GROUP BY k.pk_kid;

create index idx_ak_search_vector
    on all_karas using gin (search_vector);

create index idx_ak_created
    on all_karas (created_at desc);

create index idx_ak_serie
    on all_karas (series);

create index idx_ak_songtypes
    on all_karas (songtypes_sortable desc);

create index idx_ak_songorder
    on all_karas (songorder);

create index idx_ak_title
    on all_karas (title);

create index idx_ak_series_singers
    on all_karas (serie_singer_sortable);

create index idx_ak_language
    on all_karas (languages_sortable);

create index idx_ak_year
    on all_karas (year);

create UNIQUE index idx_ak_kid
    on all_karas (pk_kid);
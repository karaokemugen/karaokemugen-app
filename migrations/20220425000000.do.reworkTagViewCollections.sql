DROP MATERIALIZED VIEW all_tags;

CREATE TABLE all_tags AS (
	WITH kara_available AS (
		SELECT k.pk_kid
		FROM kara k
		LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
		--WHERE kt.fk_tid = 'efe171c0-e8a1-4d03-98c0-60ecf741ad52' 
		--We're not putting a where yet, this will be refreshed on first startup.
	), 
	t_count AS (
		SELECT a.fk_tid,
			json_agg(json_build_object('type', a.type, 'count', a.c))::text AS count_per_type
		FROM (SELECT kara_tag.fk_tid,
					count(kara_tag.fk_kid) AS c,
					kara_tag.type
			FROM kara_tag
			WHERE kara_tag.fk_kid IN (SELECT * FROM kara_available)
			GROUP BY kara_tag.fk_tid, kara_tag.type) a
		GROUP BY a.fk_tid
	)

	select t.*,
		t_count.count_per_type::jsonb AS karacount
	from tag t
		LEFT JOIN t_count ON t.pk_tid = t_count.fk_tid

);

CREATE UNIQUE INDEX idx_at_tid
    on all_tags (pk_tid);

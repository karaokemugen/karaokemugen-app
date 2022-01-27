DROP MATERIALIZED VIEW IF EXISTS all_tags;

ALTER TABLE tag DROP COLUMN IF EXISTS modified_at;

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

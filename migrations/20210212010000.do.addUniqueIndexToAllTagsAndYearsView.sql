DROP INDEX idx_at_tid;

CREATE UNIQUE INDEX idx_at_tid
    on all_tags (tid);

DROP INDEX idx_ay_year;

CREATE UNIQUE INDEX idx_ay_year ON all_years(year);

DROP INDEX idx_ak_kid;

CREATE UNIQUE index idx_ak_kid
    on all_karas (kid);
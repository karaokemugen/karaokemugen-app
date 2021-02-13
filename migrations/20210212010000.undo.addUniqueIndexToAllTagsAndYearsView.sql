DROP INDEX idx_at_tid;

CREATE INDEX idx_at_tid
    on all_tags (tid);

DROP INDEX idx_ay_year;

CREATE INDEX idx_ay_year ON all_years(year);

DROP INDEX idx_ak_kid;

CREATE INDEX idx_ak_kid
    on all_karas (kid);
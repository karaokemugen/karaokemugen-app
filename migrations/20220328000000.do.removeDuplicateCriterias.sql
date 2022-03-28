DELETE FROM playlist_criteria T1
    USING   playlist_criteria T2
WHERE   T1.ctid    < T2.ctid --yes, it works, this is an internal, hidden column
    AND T1.fk_id_playlist < T2.fk_id_playlist
    AND T1.value = T2.value
    AND T1.type = T2.type;

CREATE UNIQUE INDEX ON playlist_criteria USING btree(fk_id_playlist, type, value);
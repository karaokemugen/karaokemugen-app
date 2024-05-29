UPDATE all_karas ak
SET search_vector_parents = search_vector || (
    SELECT tsvector_agg(akp.search_vector)
    FROM all_karas akp
    LEFT JOIN kara_relation kr ON kr.fk_kid_child = akp.pk_kid
    WHERE kr.fk_kid_parent = ak.pk_kid
    );

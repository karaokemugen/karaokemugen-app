UPDATE blacklist_criteria SET 
    type = $blctype,
    value = $blcvalue
WHERE pk_id_blcriteria = $blc_id
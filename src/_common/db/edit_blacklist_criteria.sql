UPDATE blacklist_criteria SET 
    blcriteria_type = $blctype,
    blcriteria_value = $blcvalue
WHERE pk_id_blcriteria = $blc_id
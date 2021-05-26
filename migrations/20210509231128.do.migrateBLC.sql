update blacklist_criteria set type = 1005 where type = 0 and value !~ '^\d+$';

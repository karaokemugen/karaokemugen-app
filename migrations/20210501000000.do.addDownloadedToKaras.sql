ALTER TABLE kara ADD COLUMN download_status character VARYING DEFAULT 'MISSING';
ALTER TABLE all_karas ADD COLUMN download_status character VARYING DEFAULT 'MISSING';
UPDATE kara SET download_status = 'MISSING';
UPDATE all_karas SET download_status = 'MISSING';
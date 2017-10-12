SELECT db.value AS karasdb_uuid,
       udb.value AS userdb_uuid
FROM karasdb.settings AS db,
     settings AS udb
WHERE db.option = 'uuid' AND udb.option = 'uuid'
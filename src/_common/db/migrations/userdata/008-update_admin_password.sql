-- Up 

UPDATE user SET password = 'f8beafdd0476bad36457aff9d8dc783c7c5b8ae43c9cd1c6cfea40ea5ca8cf35' WHERE login = 'admin';

-- Down

UPDATE user SET password = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' WHERE login = 'admin';
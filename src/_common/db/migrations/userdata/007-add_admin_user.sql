-- Up 

INSERT INTO user(login,password,nickname,NORM_nickname,flag_admin,last_login)
VALUES ('admin','8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918','Administrator','Administrator',1,0);

-- Down

DELETE FROM user WHERE login = 'admin';
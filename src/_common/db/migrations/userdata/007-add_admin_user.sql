-- Up 

INSERT INTO user(login,password,nickname,NORM_nickname,flag_admin,last_login)
VALUES ('admin','','Administrator','Administrator',1,0);

-- Down

DELETE FROM user WHERE login = 'admin';
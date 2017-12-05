-- Up

INSERT INTO avatar VALUES(0,1,'');
INSERT INTO guest VALUES(0,'',0);

-- Down

DELETE FROM avatar WHERE pk_id_avatar = 0;
DELETE FROM guest WHERE pk_id_guest = 0;
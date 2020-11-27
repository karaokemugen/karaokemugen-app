begin transaction;
delete from users ou
where type = 2 and pk_login in (
    select pk_login from users where type = 2 and
            (select count(*) from users inr where type = 2 and lower(inr.pk_login) = lower(ou.pk_login)) > 1
);
update users set pk_login = lower(pk_login) where type = 2;
commit;

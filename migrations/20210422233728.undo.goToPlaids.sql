begin transaction;

drop extension if exists pgcrypto;

alter table playlist_content
    drop constraint playlist_content_fk_id_playlist_fkey;

alter table playlist
    alter column pk_id_playlist type text;

alter table playlist_content
    alter column fk_id_playlist type text,
    add constraint playlist_content_fk_id_playlist_fkey
        foreign key (fk_id_playlist) references playlist
            on update cascade on delete cascade;

update playlist set pk_id_playlist = nextval('playlist_pk_id_playlist_seq')::text;

alter table playlist_content
    drop constraint playlist_content_fk_id_playlist_fkey;

alter table playlist
    alter column pk_id_playlist set default nextval('playlist_pk_id_playlist_seq');

alter table playlist
    alter column pk_id_playlist type int using pk_id_playlist::int;

alter table playlist_content
    alter column fk_id_playlist type int using fk_id_playlist::int,
    add constraint playlist_content_fk_id_playlist_fkey
        foreign key (fk_id_playlist) references playlist
            on delete cascade;

commit;

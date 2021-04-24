alter table playlist_content
    drop constraint playlist_content_fk_id_playlist_fkey;

alter table playlist
    alter column pk_id_playlist type text;

alter table playlist_content
    alter column fk_id_playlist type text,
    add constraint playlist_content_fk_id_playlist_fkey
        foreign key (fk_id_playlist) references playlist
            on update cascade on delete cascade;

update playlist set pk_id_playlist = gen_random_uuid()::text;

alter table playlist_content
    drop constraint playlist_content_fk_id_playlist_fkey;

alter table playlist
    alter column pk_id_playlist set default gen_random_uuid();

alter table playlist
    alter column pk_id_playlist type uuid using pk_id_playlist::uuid;

alter table playlist_content
    alter column fk_id_playlist type uuid using fk_id_playlist::uuid,
    add constraint playlist_content_fk_id_playlist_fkey
        foreign key (fk_id_playlist) references playlist
            on delete cascade;

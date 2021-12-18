alter table users add column flag_public boolean default(true) not null;
alter table users add column flag_displayfavorites boolean default(false) not null;
alter table users add column social_networks jsonb default('{"discord":"", "twitter": "", "twitch": "", "instagram": ""}') not null;
alter table users add column banner character varying default('default.jpg') not null;

update users set flag_public = true, flag_displayfavorites = false, social_networks = '{"discord":"", "twitter": "", "twitch": "", "instagram": ""}', banner = 'default.jpg';

alter table users add column IF NOT EXISTS flag_public boolean default(true) not null;
alter table users add column IF NOT EXISTS flag_displayfavorites boolean default(false) not null;
alter table users add column IF NOT EXISTS social_networks jsonb default('{"discord":"", "twitter": "", "twitch": "", "instagram": ""}') not null;
alter table users add column IF NOT EXISTS banner character varying default('default.jpg') not null;

update users set flag_public = true, flag_displayfavorites = false, social_networks = '{"discord":"", "twitter": "", "twitch": "", "instagram": ""}', banner = 'default.jpg';

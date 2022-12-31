export interface DBStats {
	singers: number;
	songwriters: number;
	creators: number;
	authors: number;
	karas: number;
	languages: number;
	usagetime: number;
	playtime: number;
	series: number;
	played: number;
	playlists: number;
	duration: number;
	blacklist: number;
	whitelist: number;
	tags: number;
	total_media_size: number;
}

export interface DBSetting {
	option: string;
	value: string;
}

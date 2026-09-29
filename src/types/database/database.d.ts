import { DBStats } from "../../lib/types/database/kara.js";

export interface DBSetting {
	option: string;
	value: string;
}

export interface DBStatsApp extends DBStats {
	usagetime: number;
	playtime: number;
	played: number;
	playlists: number;
	blacklist: number;
	whitelist: number;
	tags: number;
}
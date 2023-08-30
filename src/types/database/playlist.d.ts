import { DBPLBase, DBPLC } from '../../lib/types/database/playlist.js';

export interface DBPL extends DBPLBase {
	time_left?: number;
	plcid_playing?: number;
	flag_current?: boolean;
	flag_public?: boolean;
	flag_whitelist?: boolean;
	flag_blacklist?: boolean;
	flag_fallback?: boolean;
	flag_smart?: boolean;
	type_smart?: SmartPlaylistType;
	flag_smartlimit?: boolean;
	smart_limit_order?: SmartPlaylistLimitOrder;
	smart_limit_type?: SmartPlaylistLimitType;
	smart_limit_number?: number;
}

export interface DBPLPos {
	pos: number;
	plcid: number;
}

export interface DBPLKidUser extends DBPLPos {
	flag_playing: boolean;
}

export interface DBPLCInfo extends DBPLC {
	time_before_play: number;
}

export type SmartPlaylistLimitType = 'songs' | 'duration';
export type SmartPlaylistLimitOrder = 'newest' | 'oldest';
export type SmartPlaylistType = 'UNION' | 'INTERSECT';

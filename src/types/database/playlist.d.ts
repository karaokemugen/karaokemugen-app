import { DBPLC } from '../../lib/types/database/playlist.js';

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

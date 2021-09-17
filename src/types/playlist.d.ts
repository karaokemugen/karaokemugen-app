import { DBPLCBase } from '../lib/types/database/playlist';

export interface CurrentSong extends DBPLCBase {
	avatar?: string,
	infos?: string
}

export interface Pos {
	index: number,
	plc_id_pos: number
}

export type ShuffleMethods = 'normal' | 'smart' | 'balance' | 'upvotes';

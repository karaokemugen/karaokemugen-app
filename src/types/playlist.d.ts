import { DBKara } from '../lib/types/database/kara';
import { DBPLCBase } from '../lib/types/database/playlist';

export interface CurrentSong extends DBPLCBase, DBKara {
	avatar?: string;
	infos?: string;
}

export interface Pos {
	index: number;
	plc_id_pos: number;
}

export type ShuffleMethods = 'normal' | 'smart' | 'balance' | 'upvotes';

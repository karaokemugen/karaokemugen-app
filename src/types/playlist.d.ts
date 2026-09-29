import { DBKara } from '../lib/types/database/kara.js';
import { DBPLCBase } from '../lib/types/database/playlist.js';
import { AggregatedCriteria } from '../lib/types/playlist.js';
import { shuffleMethods } from '../utils/constants.ts';

export interface CurrentSong extends DBPLCBase, DBKara {
	avatar?: string;
	infos?: string;
}

export interface Pos {
	index: number;
	plc_id_pos: number;
}

export type ShuffleMethods = typeof shuffleMethods[number];

export interface AddKaraParams {
	kids: string[];
	requester: string;
	plaid?: string;
	pos?: number;
	ignoreQuota?: boolean;
	refresh?: boolean;
	criterias?: AggregatedCriteria[];
	throwOnMissingKara?: boolean;
	visible?: boolean;
}

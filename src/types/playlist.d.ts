import { DBKara } from '../lib/types/database/kara.js';
import { DBPLCBase } from '../lib/types/database/playlist.js';
import { AggregatedCriteria } from '../lib/types/playlist.js';

export interface CurrentSong extends DBPLCBase, DBKara {
	avatar?: string;
	infos?: string;
}

export interface Pos {
	index: number;
	plc_id_pos: number;
}

export type ShuffleMethods = 'normal' | 'smart' | 'balance' | 'upvotes';

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

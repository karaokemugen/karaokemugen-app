import { DBPLC } from '../lib/types/database/playlist.js';

export interface PollState {
	songPoll: boolean;
}

export interface PollResults {
	votes: number;
	kara: string;
	index: number;
}

export interface PollItem extends DBPLC {
	votes?: number;
	index?: number;
}

export interface PollObject {
	infos: { count: number; from: number; to: number };
	poll: PollItem[];
	timeLeft: number;
	flag_uservoted: boolean;
}

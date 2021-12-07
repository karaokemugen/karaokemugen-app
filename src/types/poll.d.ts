import { DBPLC } from './database/playlist';

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

import { KaraFileV4 } from '../lib/types/kara.js';

export interface DifferentChecksumReport {
	kara1: KaraFileV4;
	kara2: KaraFileV4;
}

export interface Change {
	type: 'new' | 'delete';
	path: string;
	uid?: string;
}

export interface Push {
	commits: Commit[];
	modifiedMedias: ModifiedMedia[];
}

export interface Commit {
	addedFiles: string[];
	removedFiles: string[];
	message: string;
}

export interface ModifiedMedia {
	new: string;
	old: string;
	sizeDifference?: boolean;
	commit: string;
}

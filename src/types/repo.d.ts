import { KaraFileV4 } from '../lib/types/kara';

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

// Used for migration to zip-based repositories
export interface OldRepository {
	Name: string;
	Online: boolean;
	Enabled: boolean;
	SendStats?: boolean;
	Path: {
		Karas: string[];
		Lyrics: string[];
		Medias: string[];
		Tags: string[];
		Series?: string[];
	};
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

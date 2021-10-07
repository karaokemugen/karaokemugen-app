import { Kara } from '../lib/types/kara';

export interface DifferentChecksumReport {
	kara1: Kara;
	kara2: Kara;
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

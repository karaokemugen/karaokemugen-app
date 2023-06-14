import { TagAndType } from '../lib/types/tag.js';

interface FavExportContent {
	kid: string;
}

export interface FavExport {
	Header: {
		description: string;
		version: number;
	};
	Favorites: FavExportContent[];
}

export interface AutoMixPlaylistInfo {
	plaid: string;
	playlist_name: string;
}

export type PlaylistLimit = 'duration' | 'songs';

export interface AutoMixParams {
	filters?: {
		usersFavorites?: string[];
		usersAnimeList?: string[];
		years?: number[];
		tags?: TagAndType[];
	};
	limitType?: PlaylistLimit;
	limitNumber?: number;
	playlistName?: string;
	surprisePlaylist?: boolean;
}

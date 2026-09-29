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

export const playlistLimit = ['duration', 'songs'];
export type PlaylistLimit = typeof playlistLimit[number];

export interface FavoritesMicro {
	kid: string;
}

export interface AutoMixParams {
	filters: {
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

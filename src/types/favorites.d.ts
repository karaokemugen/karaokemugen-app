import {KaraParams} from '../lib/types/kara';

export interface FavParams extends KaraParams {
	username: string
}

interface FavExportContent {
	kid: string
}

export interface FavExport {
	Header: {
		description: string,
		version: number
	},
	Favorites: FavExportContent[]
}

export interface AutoMixPlaylistInfo {
	playlist_id: number,
	playlist_name: string
}

export interface AutoMixParams {
	users: string[],
	duration: number
}
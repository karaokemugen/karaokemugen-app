import {KaraParams} from '../lib/types/kara';

export interface FavParams extends KaraParams {
	username: string
}

interface FavExportContent {
	kid: string
}

export interface Favorite {
	kid: string,
	username: string
}
export interface FavExport {
	Header: {
		description: string,
		version: number
	},
	Favorites: FavExportContent[]
}

export interface AutoMixPlaylistInfo {
	plaid: string,
	playlist_name: string
}

export interface AutoMixParams {
	users: string[],
	duration: number
}

import {KaraParams} from './kara';

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

export interface AutoMixParams {
	users: string[],
	duration: number
}
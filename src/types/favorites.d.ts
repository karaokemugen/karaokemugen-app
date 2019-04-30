import {KaraParams} from './kara';

export interface FavParams extends KaraParams {
	username: string
}

interface FavExportHeader {
	description: string,
	version: number
}

interface FavExportContent {
	kid: string
}

export interface FavExport {
	Header: FavExportHeader,
	Favorites: FavExportContent[]
}

export interface AutoMixParams {
	users: string[],
	duration: number
}
import {KaraParams} from './kara';

export interface PLC {
	playlist_id: number,
	playlistcontent_id: number,
	username: string,
	nickname: string,
	kid: string,
	created_at: Date,
	pos: number
}

export interface PLCParams extends KaraParams {
	playlist_id: number
}

export interface Playlist {
	id: number,
	name: string,
	modified_at: Date,
	created_at: Date,
	flag_visible: boolean,
	flag_current: boolean,
	flag_public: boolean,
	username: string
}
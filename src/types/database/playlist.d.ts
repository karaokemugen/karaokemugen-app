import { DBKara, DBKaraTag } from "../../lib/types/database/kara";

export interface DBPLCKID {
	kid: string,
	login: string,
	playlistcontent_id: number,
	flag_playing: boolean
	pos: number,
	playlist_id: number,
	serie: string,
	singer: DBKaraTag[]
}

export interface DBPLCBase extends DBKara {
	nickname: string,
	flag_playing: boolean,
	pos: number,
	flag_free: boolean,
	flag_visible: boolean,
	username: string
	playlistcontent_id: number,
	playlist_id: number,
	count: number,
	repo: string
}

export interface DBPLPos {
	pos: number,
	playlistcontent_id: number
}

export interface DBPLKidUser extends DBPLPos {
	flag_playing: boolean
}

export interface DBPL {
	playlist_id: number,
	name: string,
	karacount: number,
	duration: number,
	time_left: number,
	created_at: Date,
	modified_at: Date,
	flag_visible: boolean,
	flag_current: boolean,
	flag_public: boolean,
	username: string
}

export interface DBPLCNames extends DBPLPos {
	karaname: string
}

export interface DBPLC extends DBPLCBase {
	flag_whitelisted: boolean,
	flag_blacklisted: boolean,
	upvotes: number,
	flag_upvoted: boolean,
	flag_visible: boolean
}

export interface DBPLCInfo extends DBPLC {
	time_before_play: number
}

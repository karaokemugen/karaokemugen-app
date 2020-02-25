export interface PlayerState {
	volume?: number,
	playing?: boolean,
	playerstatus?: string,
	_playing?: boolean, // internal delay flag
	timeposition?: number,
	duration?: number,
	mutestatus?: boolean,
	subtext?: string,
	currentSongInfos?: string,
	mediaType?: string,
	showsubs?: boolean,
	stayontop?: boolean,
	fullscreen?: boolean,
	ready: boolean,
	url?: string,
	status?: string
}

export interface mpvStatus {
	'sub-text': string,
	volume: number,
	duration: number,
	'playtime-remaining': number,
	'eof-reached': boolean,
	mute: boolean,
	pause: boolean,
	filename: string,
	path: string,
	'media-title': string,
	'playlist-pos': number,
	'playlist-count': number,
	loop: string,
	fullscreen: boolean
}

export interface MediaData {
	media: string,
	subfile: string,
	gain: number,
	infos: string,
	avatar: string,
	duration: number,
	repo: string
	spoiler: boolean
}
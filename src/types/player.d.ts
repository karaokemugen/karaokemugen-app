import { DBKara } from '../lib/types/database/kara';

export interface PlayerState {
	volume?: number,
	playing?: boolean,
	playerstatus?: 'stop' | 'pause' | 'play',
	_playing?: boolean, // internal delay flag
	timeposition?: number,
	duration?: number,
	mute?: boolean,
	'sub-text'?: string,
	currentSong?: MediaData,
	mediaType?: 'song' | 'background' | 'Jingles' | 'Sponsors' | 'Encores' | 'Outros' | 'Intros',
	showsubs?: boolean,
	stayontop?: boolean,
	fullscreen?: boolean,
	url?: string,
	status?: string,
	firstLaunch?: boolean
}

export interface mpvStatus {
	property: string,
	value: any
}
export interface playerStatus {
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
	loop: string,
	fullscreen: boolean
}

export interface MediaData {
	media: string,
	subfile: string,
	gain: number,
	currentSong: DBKara,
	infos: string,
	avatar: string,
	duration: number,
	repo: string
	spoiler: boolean
}

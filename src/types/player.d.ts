import { DBKara } from '../lib/types/database/kara';

export interface PlayerState {
	volume?: number,
	playing?: boolean,
	playerStatus?: 'stop' | 'pause' | 'play',
	_playing?: boolean, // internal delay flag
	timeposition?: number,
	mute?: boolean,
	'sub-text'?: string,
	currentSong?: MediaData,
	mediaType?: 'song' | 'background' | 'Jingles' | 'Sponsors' | 'Encores' | 'Outros' | 'Intros',
	showSubs?: boolean,
	stayontop?: boolean,
	fullscreen?: boolean,
	url?: string,
	monitorEnabled?: boolean,
	displayingInfo?: boolean,
	songNearEnd?: boolean,
	nextSongNotifSent?: boolean,
	isOperating?: boolean
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

export interface MpvOptions {
	monitor: boolean,
	mpvVersion: string
}

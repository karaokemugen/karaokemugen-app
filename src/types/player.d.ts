import { DBKara } from '../lib/types/database/kara';
import { Media } from './medias';
import { CurrentSong } from './playlist';

export interface PlayerState {
	volume?: number,
	playing?: boolean,
	playerStatus?: 'stop' | 'pause' | 'play',
	_playing?: boolean, // internal delay flag
	timeposition?: number,
	mute?: boolean,
	currentSong?: MediaData,
	currentMedia?: Media,
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

export interface MediaData {
	media: string,
	subfile: string,
	gain: number,
	currentSong: CurrentSong | DBKara,
	infos: string,
	avatar: string,
	duration: number,
	repo: string
	spoiler: boolean
}

export interface MpvOptions {
	monitor: boolean
}

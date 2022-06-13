import { Media } from './medias';
import { CurrentSong } from './playlist';

export interface PlayerState {
	volume?: number;
	playing?: boolean;
	playerStatus?: 'stop' | 'pause' | 'play';
	_playing?: boolean; // internal delay flag
	timeposition?: number;
	mute?: boolean;
	currentSong?: CurrentSong;
	currentMedia?: Media;
	mediaType?: 'song' | 'stop' | 'pause' | 'poll' | 'Jingles' | 'Sponsors' | 'Encores' | 'Outros' | 'Intros';
	showSubs?: boolean;
	onTop?: boolean;
	fullscreen?: boolean;
	border?: boolean;
	'eof-reached'?: boolean;
	url?: string;
	monitorEnabled?: boolean;
	songNearEnd?: boolean;
	nextSongNotifSent?: boolean;
	isOperating?: boolean;

	// Experimental modifiers
	pitch?: number;
	speed?: number;
}

export interface mpvStatus {
	property: string;
	value: any;
}

export interface MpvOptions {
	monitor: boolean;
}

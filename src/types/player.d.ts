import { PlaylistMedia, PlaylistMediaType } from '../lib/types/playlistMedias.js';
import { CurrentSong } from './playlist.js';

export type BlindMode = '' | 'black' | 'blur';

export interface SongModifiers {
	Mute?: boolean;
	Blind?: BlindMode;
	NoLyrics?: boolean;
	Pitch?: number;
	Speed?: number;
}

export interface PlayerState {
	volume?: number;
	playing?: boolean;
	playerStatus?: 'stop' | 'pause' | 'play';
	_playing?: boolean; // internal delay flag
	timeposition?: number;
	mute?: boolean;
	currentSong?: CurrentSong;
	currentMedia?: PlaylistMedia;
	mediaType?: 'song' | 'stop' | 'pause' | 'poll' | 'bundled' | PlaylistMediaType;
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
	quiz?: {
		guessTime: number;
		quickGuess: number;
		revealTime: number;
	};

	// Experimental modifiers
	pitch?: number;
	speed?: number;
	blurVideo?: boolean;
}

export interface mpvStatus {
	property: string;
	value: any;
}

export interface MpvOptions {
	monitor: boolean;
}

export type PlayerCommand =
	| 'play'
	| 'stopNow'
	| 'pause'
	| 'stopAfter'
	| 'skip'
	| 'prev'
	| 'toggleFullscreen'
	| 'toggleAlwaysOnTop'
	| 'toggleBorders'
	| 'setHwDec'
	| 'mute'
	| 'unmute'
	| 'showSubs'
	| 'hideSubs'
	| 'seek'
	| 'goTo'
	| 'setAudioDevice'
	| 'setVolume'
	| 'setPitch'
	| 'setSpeed'
	| 'setModifiers'
	| 'blurVideo'
	| 'unblurVideo';

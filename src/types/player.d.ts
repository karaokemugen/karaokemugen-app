import { PlaylistMedia, PlaylistMediaType } from '../lib/types/playlistMedias.js';
import { CurrentSong } from './playlist.js';

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

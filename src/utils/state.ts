// KM Imports
// Node modules
import merge from 'lodash.merge';

import { supportedFiles } from '../lib/utils/constants';
import logger from '../lib/utils/logger';
import {emit} from '../lib/utils/pubsub';
import {emitWS} from '../lib/utils/ws';
// Types
import {PublicState,State} from '../types/state';

// Internal settings
let state: State = {
	playerNeedsRestart: false,
	currentRequester: null,
	currentlyPlayingKara: null,
	currentSong: null,
	counterToJingle: 0,
	counterToSponsor: 0,
	introPlayed: false,
	encorePlayed: false,
	status: 'stop', // [stop,play,pause] // general engine status
	private: true, // Karaoke Mode
	fullscreen: false,
	ontop: true,
	playlist: null,
	timeposition: 0,
	songPoll: false,
	frontendPort: null,
	ready: false,
	forceDisableAppUpdate: false,
	currentSessionID: null,
	isDemo: false,
	isTest: false,
	defaultLocale: 'en',
	securityCode: null,
	wsLogNamespace: null,
	noAutoTest: false,
	singlePlay: false,
	randomPlaying: false,
	player: {},
	opt: {},
	args: []
};

let previousState = {...state};

/** Get public state (to send to webapp users) */
export function getPlayerState(): PublicState {
	return {
		currentlyPlaying: state.currentlyPlayingKara,
		currentSessionID: state.currentSessionID,
		duration: state.player.duration,
		fullscreen: state.player.fullscreen,
		mute: state.player.mute,
		onTop: state.ontop,
		playerStatus: state.player.playerStatus,
		playing: state.player.playing,
		private: state.private,
		showSubs: state.player.showsubs,
		status: state.status,
		subText: state.player['sub-text'],
		timePosition: state.player.timeposition,
		volume: state.player.volume,
		currentRequester: state.currentRequester,
		defaultLocale: state.defaultLocale
	};
}

/** Emit via websockets the public state */
function emitPlayerState() {
	emitWS('playerStatus', getPlayerState());
}

/** Get current app state object */
export function getState() {
	return {...state};
}

/** Get public state */
export function getPublicState(admin: boolean) {
	return {
		modePlaylistID: state.modePlaylistID,
		appPath: admin ? state.appPath : undefined,
		dataPath: admin ? state.dataPath : undefined,
		os: admin ? state.os : undefined,
		wsLogNamespace: admin ? state.wsLogNamespace : undefined,
		electron: state.electron,
		supportedLyrics: supportedFiles.lyrics,
		supportedMedias: [].concat(supportedFiles.video, supportedFiles.audio)
	};
}

/** Set one or more settings in app state */
export function setState(part: any) {
	state = merge(state, part);
	manageMode();
	emit('stateUpdated', state);
	emitPlayerState();
	previousState = {...state};
	return getState();
}

/** Change and display which karaoke mode we're on */
function manageMode() {
	state.private
		? state.modePlaylistID = state.currentPlaylistID
		: state.modePlaylistID = state.publicPlaylistID;
	if (state.private !== previousState.private) {
		state.private
			? logger.info('[State] Karaoke mode switching to private')
			: logger.info('[State] Karaoke mode switching to public');
	}
}

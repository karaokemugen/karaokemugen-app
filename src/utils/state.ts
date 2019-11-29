import {emitWS} from '../lib/utils/ws';
import {emit} from '../lib/utils/pubsub';
import logger from '../lib/utils/logger';
import merge from 'lodash.merge';
import {State, PublicState} from '../types/state';

// Internal settings
let state: State = {
	playerNeedsRestart: false,
	currentRequester: null,
	currentlyPlayingKara: null,
	counterToJingle: 1,
	introPlayed: false,
	status: 'stop', // [stop,play,pause] // general engine status
	private: true, // Karaoke Mode
	fullscreen: false,
	ontop: true,
	playlist: null,
	timeposition: 0,
	songPoll: false,
	frontendPort: null,
	ready: false,
	currentSessionID: null,
	isDemo: false,
	isTest: false,
	EngineDefaultLocale: 'fr',
	securityCode: null,
	player: {
		ready: false
	},
	opt: {}
};

let previousState = {...state};

/** Get public state (to send to webapp users) */
export function getPublicState(): PublicState {
	return {
		currentlyPlaying: state.currentlyPlayingKara,
		currentSessionID: state.currentSessionID,
		duration: state.player.duration,
		fullscreen: state.player.fullscreen,
		muteStatus: state.player.mutestatus,
		onTop: state.ontop,
		playerStatus: state.player.playerstatus,
		playing: state.player.playing,
		private: state.private,
		showSubs: state.player.showsubs,
		status: state.status,
		subText: state.player.subtext,
		timePosition: state.player.timeposition,
		volume: state.player.volume,
		currentRequester: state.currentRequester
	};
}

/** Emit via websockets the public state */
export function emitState() {
	if (state.player.ready) emitWS('playerStatus', getPublicState());
};

/** Get current app state object */
export function getState() {
	return {...state};
}

/** Set one or more settings in app state */
export function setState(part: object) {
	state = merge(state, part);
	manageMode();
	emit('stateUpdated', state);
	emitState();
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
			? logger.info('[Engine] Karaoke mode switching to private')
			: logger.info('[Engine] Karaoke mode switching to public');
	}
}

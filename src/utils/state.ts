import {emitWS} from '../webapp/frontend';
import {emit} from './pubsub';
import logger from 'winston';
import merge from 'lodash.merge';
import {State, PublicState} from '../types/state';

// Internal settings
let state: State = {
	playerNeedsRestart: false,
	currentlyPlayingKara: null,
	counterToJingle: 1,
	status: 'stop', // [stop,play,pause] // general engine status
	private: true, //  // karaoke mode
	fullscreen: false,
	ontop: true,
	playlist: null,
	timeposition: 0,
	songPoll: false,
	frontendPort: null,
	ready: false,
	sessionStart: new Date(),
	isDemo: false,
	isTest: false,
	EngineDefaultLocale: 'fr',
	player: {
		ready: false
	},
	opt: {
		generateDB: false,
		reset: false,
		noBaseCheck: false,
		strict: false,
		noMedia: false,
		baseUpdate: false,
		noBrowser: false,
		profiling: false,
		sql: false,
		validate: false,
		debug: false,
		forceAdminPassword: undefined
	}
};
let previousState = {...state};

export function getPublicState(): PublicState {
	return {
		playing: state.player.playing,
		private: state.private,
		status: state.status,
		onTop: state.ontop,
		fullscreen: state.player.fullscreen,
		timePosition: state.player.timeposition,
		duration: state.player.duration,
		muteStatus: state.player.mutestatus,
		playerStatus: state.player.playerstatus,
		currentlyPlaying: state.currentlyPlayingKara,
		subText: state.player.subtext,
		showSubs: state.player.showsubs,
		volume: state.player.volume,
	};
}

export function emitState() {
	if (state.player.ready) emitWS('playerStatus', getPublicState());
};

export function getState() {
	return {...state};
}

export function setState(part: object) {
	state = merge(state, part);
	manageMode();
	emit('stateUpdated', state);
	emitState();
	previousState = {...state};
	return getState();
}

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
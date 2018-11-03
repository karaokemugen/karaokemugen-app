import {emitWS} from '../../_webapp/frontend';
import {emit} from './pubsub';
import logger from 'winston';

// Internal settings
let state = {
	currentPlaylistID: undefined,
	publicPlaylistID: undefined,
	modePlaylistID: undefined,
	playerNeedsRestart: false,
	currentlyPlayingKara: null,
	counterToJingle: 1,
	status: 'stop', // [stop,play,pause] // general engine status
	private: 1, // [int(1|0)] // karaoke mode
	fullscreen: false,
	ontop: true,
	playlist: null,
	timeposition: 0,
	songPoll: false,
	frontendPort: null,
	player: {},
	ready: false
};
let previousState = {...state};

export function getPublicState() {
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
	if (state.player.ready) emitWS('playerStatus',getPublicState());
};

export function getState() {
	return {...state};
}

export function setState(part) {
	state = {...state, ...part};
	manageMode();
	emit('stateUpdated', state);
	emitState();
	previousState = {...state};
	return getState();
}

function manageMode() {
	state.private ? state.modePlaylistID = state.currentPlaylistID : state.modePlaylistID = state.publicPlaylistID;
	if (+state.private !== +previousState.private) {
		+state.private === 1 ? logger.info('[Engine] Karaoke mode switching to private') : logger.info('[Engine] Karaoke mode switching to public');
	}
}
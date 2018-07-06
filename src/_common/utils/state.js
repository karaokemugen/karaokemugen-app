import {emitWS} from '../../_webapp/frontend';
import {emit} from './pubsub';
// Internal settings
let state = {
	currentPlaylistID: undefined,
	publicPlaylistID: undefined,
	modePlaylistID: undefined,
	playerNeedsRestart: false,
	currentlyPlayingKara: null,
	counterToJingle: 1,
	status: 'stop', // [stop,play,pause] // general engine status
	private: true, // [bool(true|false)] // karaoke mode
	fullscreen: false,
	ontop: true,
	playlist: null,
	timeposition: 0,
	songPoll: false,
	frontendPort: null,
	player: {}
};

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
	state.private ? state.modePlaylistID = state.currentPlaylistID : state.modePlaylistID = state.publicPlaylistID;
	emit('stateUpdated', state);
	emitState();
	return getState();
}
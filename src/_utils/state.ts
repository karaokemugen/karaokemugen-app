import {emitWS} from '../_webapp/frontend';
import {emit} from './pubsub';
import logger from 'winston';
import merge from 'lodash.merge';

interface State {
	currentPlaylistID: number,
	publicPlaylistID: number,
	modePlaylistID: number,
	playerNeedsRestart: boolean,
	currentlyPlayingKara: boolean,
	counterToJingle: number,
	status: string,
	private: boolean,
	fullscreen: boolean,
	ontop: boolean,
	playlist: null,
	timeposition: 0,
	songPoll: boolean,
	frontendPort: number,
	player: {
		playing: boolean,
		fullscreen: boolean,
		timeposition: number,
		duration: number,
		mutestatus: string,
		playerstatus: string,
		currentlyPlaying: boolean,
		subtext: string,
		showsubs: boolean,
		volume: number,
		ready: boolean
	},
	ready: boolean,
	sessionStart: Date,
	isDemo: boolean,
	isTest: boolean,
	appPath: string,
	osURL: string,
	os: string,
	version: {
		number: string,
		name: string,
		image: string
	},
	binPath: {
		mpv: string,
		ffmpeg: string,
		postgres: string,
		postgres_ctl: string,
		postgres_dump: string,
	},
	opt: {
		generateDB: boolean,
		reset: boolean,
		noBaseCheck: boolean,
		strict: boolean,
		noMedia: boolean,
		baseUpdate: boolean,
		noBrowser: boolean,
		profiling: boolean,
		sql: boolean,
		validate: boolean,
		debug: boolean
	},
	EngineDefaultLocale: string
}

interface PublicState {
	playing: boolean,
	private: boolean,
	status: string,
	onTop: boolean,
	fullscreen: boolean,
	timePosition: number,
	duration: number,
	muteStatus: string,
	playerStatus: string,
	currentlyPlaying: boolean,
	subText: string,
	showSubs: boolean,
	volume: number,
}

// Internal settings
let state: State = {
	currentPlaylistID: undefined,
	publicPlaylistID: undefined,
	modePlaylistID: undefined,
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
	player: {
		playing: undefined,
		fullscreen: undefined,
		timeposition: undefined,
		duration: undefined,
		mutestatus: undefined,
		playerstatus: undefined,
		currentlyPlaying: undefined,
		subtext: undefined,
		showsubs: undefined,
		volume: undefined,
		ready: undefined
	},
	ready: false,
	sessionStart: new Date(),
	isDemo: false,
	isTest: false,
	appPath: undefined,
	osURL: undefined,
	os: undefined,
	version: {
		number: undefined,
		name: '',
		image: undefined
	},
	binPath: {
		mpv: undefined,
		ffmpeg: undefined,
		postgres: undefined,
		postgres_ctl: undefined,
		postgres_dump: undefined,
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
		debug: false
	},
	EngineDefaultLocale: 'fr'
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
	if (state.player.ready) emitWS('playerStatus',getPublicState());
};

export function getState() {
	return {...state};
}

export function setState(part) {
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
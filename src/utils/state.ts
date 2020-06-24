// KM Imports
// Node modules
import merge from 'lodash.merge';

import { supportedFiles } from '../lib/utils/constants';
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
	args: [],
	environment: process.env.SENTRY_ENVIRONMENT,
	sentrytest: (process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') as boolean
};

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
		showSubs: state.player.showsubs,
		subText: state.player['sub-text'],
		timePosition: state.player.timeposition,
		volume: state.player.volume,
		currentRequester: state.currentRequester,
		defaultLocale: state.defaultLocale,
		environment: process.env.SENTRY_ENVIRONMENT,
		sentrytest: (process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') as boolean
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
	emit('stateUpdated', state);
	emitPlayerState();
	return getState();
}

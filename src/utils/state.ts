// Node modules
import { merge } from 'lodash';

import packageJSON from '../../package.json';
// KM Imports
import { getConfig } from '../lib/utils/config.js';
import { supportedFiles } from '../lib/utils/constants.js';
import { emit } from '../lib/utils/pubsub.js';
import { emitWS } from '../lib/utils/ws.js';
// Types
import { PublicPlayerState, PublicState, State } from '../types/state.js';

// Internal settings
let state: State = {
	playerNeedsRestart: false,
	shutdownInProgress: false,
	currentRequester: null,
	stopping: false,
	counterToJingle: 1,
	counterToSponsor: 1,
	introPlayed: false,
	introSponsorPlayed: false,
	encorePlayed: false,
	usersBalance: new Set<string>(),
	playlist: null,
	timeposition: 0,
	songPoll: false,
	frontendPort: null,
	ready: false,
	forceDisableAppUpdate: false,
	currentSessionID: null,
	isTest: false,
	defaultLocale: 'en',
	securityCode: null,
	noAutoTest: false,
	singlePlay: false,
	randomPlaying: false,
	streamerPause: false,
	pauseInProgress: false,
	player: {},
	opt: {},
	args: [],
	environment: process.env.SENTRY_ENVIRONMENT,
	sentrytest: (process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') as boolean,
	version: {
		number: packageJSON.version,
		name: packageJSON.versionName,
	},
	restoreNeeded: false,
	systemMessages: [],
	DBReady: false,
	portable: false,
	quizMode: false,
	quizGuessingTime: false,
	quiz: {
		guessTime: 0,
		quickGuess: 0,
		revealTime: 0,
	},
};

/** Get public state (to send to webapp users) */
export function getPlayerState(): PublicPlayerState {
	const conf = getConfig();
	return {
		...state.player,
		currentSessionID: state.currentSessionID,
		currentRequester: state.currentRequester,
		stopping: state.stopping,
		streamerPause: state.streamerPause,
		defaultLocale: conf.App.Language,
		songsBeforeJingle: conf.Playlist?.Medias.Jingles.Enabled
			? conf.Playlist?.Medias.Jingles.Interval - state.counterToJingle
			: undefined,
		songsBeforeSponsor: conf.Playlist?.Medias.Sponsors.Enabled
			? conf.Playlist?.Medias.Sponsors.Interval - state.counterToSponsor
			: undefined,
	};
}

/** Emit via websockets the public state */
function emitPlayerState(part: Partial<State>) {
	// Compute diff in other elements
	const map = new Map([
		['counterToJingle', { conf: 'Jingles', state: 'songsBeforeJingle' }],
		['counterToSponsor', { conf: 'Sponsors', state: 'songsBeforeSponsor' }],
	]);
	const toEmit: Partial<PublicPlayerState> = { ...part.player };
	for (const key of [
		'currentSong',
		'currentSessionID',
		'currentRequester',
		'stopping',
		'defaultLocale',
		'counterToJingle',
		'counterToSponsor',
	]) {
		switch (key) {
			case 'counterToJingle':
			case 'counterToSponsor':
				const conf = getConfig();
				const options = map.get(key);
				if (key in part) {
					if (conf.Playlist?.Medias[options.conf].Enabled) {
						toEmit[options.state] = conf.Playlist?.Medias[options.conf].Interval - part[key];
					}
				}
				break;
			default:
				if (key in part) {
					toEmit[key] = part[key];
				}
				break;
		}
	}
	if (Object.keys(toEmit).length !== 0) {
		emitWS('playerStatus', toEmit);
	}
}

/** Get current app state object */
export function getState() {
	return { ...state };
}

/** Get public state */
export function getPublicState(admin: boolean): PublicState {
	return {
		currentPlaid: state.currentPlaid,
		publicPlaid: state.publicPlaid,
		blacklistPlaid: state.blacklistPlaid,
		whitelistPlaid: state.whitelistPlaid,
		fallbackPlaid: state.fallbackPlaid,
		appPath: admin ? state.appPath : undefined,
		dataPath: admin ? state.dataPath : undefined,
		os: admin ? state.os : undefined,
		defaultLocale: state.defaultLocale,
		supportedLyrics: supportedFiles.lyrics,
		supportedMedias: [].concat(supportedFiles.video, supportedFiles.audio),
		environment: process.env.SENTRY_ENVIRONMENT,
		sentrytest: (process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') as boolean,
		url: state.osURL,
		quiz: state.quizMode,
		quizGame: state.currentQuizGame,
	};
}

/** Set one or more settings in app state */
export function setState(part: Partial<State>) {
	// lodash merges must not merge karas info.
	if (part?.player?.currentSong && part?.player?.currentSong.kid !== state?.player?.currentSong?.kid) {
		state.player.currentSong = null;
	}
	state = merge(state, part);
	emit('stateUpdated', state);
	emitPlayerState(part);
	return getState();
}

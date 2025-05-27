// Node modules
import { merge } from 'lodash';

import packageJSON from '../../package.json' with { type: 'json' };
import { RecursivePartial } from '../lib/types/index.js';
// KM Imports
import { getConfig } from '../lib/utils/config.js';
import { supportedFiles } from '../lib/utils/constants.js';
import { emit } from '../lib/utils/pubsub.js';
import { emitWS } from '../lib/utils/ws.js';
// Types
import { GameState } from '../types/quiz.js';
import { PublicPlayerState, PublicState, State } from '../types/state.js';
import { defaultQuizSettings } from './constants.js';

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
	newAccountCode: null,
	noAutoTest: false,
	singlePlay: false,
	randomPlaying: false,
	streamerPause: false,
	pauseInProgress: false,
	player: {},
	opt: {},
	args: [],
	version: {
		number: packageJSON.version,
		name: packageJSON.versionName,
	},
	systemMessages: [],
	DBReady: false,
	portable: false,
	quiz: {
		running: false,
		quizGuessingTime: false,
		currentSongNumber: 0,
		currentTotalDuration: 0,
		playlist: '',
		KIDsPlayed: [],
		guessTime: 0,
		quickGuess: 0,
		revealTime: 0,
		settings: defaultQuizSettings,
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
function emitPlayerState(part: RecursivePartial<State>) {
	// Compute diff in other elements
	const map = new Map([
		['counterToJingle', { conf: 'Jingles', state: 'songsBeforeJingle' }],
		['counterToSponsor', { conf: 'Sponsors', state: 'songsBeforeSponsor' }],
	]);
	const toEmit: RecursivePartial<PublicPlayerState> = { ...part.player };
	for (const key of [
		'currentSong',
		'currentSessionID',
		'currentRequester',
		'stopping',
		'streamerPause',
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

function emitQuizState(part: RecursivePartial<State>) {
	if (part.quiz) {
		emitWS('quizStateUpdated', getPublicCurrentGame(false, part.quiz));
		emitWS('quizStateUpdated', getPublicCurrentGame(true, part.quiz), 'admin'); // FIXME doesn't work, admin doesn't join the room
	}
}

/** Get current app state object */
export function getState(): State {
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
		sentrydsn: process.env.sentrydsn,
		sentrytest: (process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') as boolean,
		url: state.osURL,
		songPoll: state.songPoll,
		quiz: getPublicCurrentGame(admin),
		newAccountCode: admin ? state.newAccountCode : undefined,
	};
}

export function getPublicCurrentGame(admin: boolean): GameState;
export function getPublicCurrentGame(
	admin: boolean,
	gameState: RecursivePartial<GameState>
): RecursivePartial<GameState>;
export function getPublicCurrentGame(admin: boolean, gameState: RecursivePartial<GameState> = state.quiz) {
	// only allow to see currentSong for non admin during answers
	if (admin || state.quiz.currentSong?.state === 'answer') {
		return gameState;
	}
	return { ...gameState, currentSong: null };
}

/** Set one or more settings in app state */
export function setState(part: RecursivePartial<State>) {
	// lodash merges must not merge karas info.
	if (part?.player?.currentSong && part?.player?.currentSong.kid !== state?.player?.currentSong?.kid) {
		state.player.currentSong = null;
	}
	state = merge(state, part);
	emit('stateUpdated', state);
	emitPlayerState(part);
	emitQuizState(part);
	return getState();
}

import { RemoteFailure, RemoteSuccess } from '../lib/types/remote.js';
import { BinariesConfig } from './binChecker.js';
import { PlayerState } from './player.js';
import { CurrentSong } from './playlist.js';

export interface Version {
	number?: string;
	name?: string;
	image?: string;
	sha?: string;
}

export interface State {
	appHasBeenUpdated?: boolean;
	shutdownInProgress?: boolean;
	currentPlaid?: string;
	blacklistPlaid?: string;
	whitelistPlaid?: string;
	fallbackPlaid?: string;
	currentSessionID?: string;
	currentSessionEndsAt?: Date;
	publicPlaid?: string;
	playerNeedsRestart?: boolean;
	currentRequester?: string;
	stopping: boolean;
	streamerPause: boolean;
	pauseInProgress: boolean;
	randomPlaying: boolean;
	counterToJingle?: number;
	counterToSponsor?: number;
	introPlayed?: boolean;
	introSponsorPlayed?: boolean;
	encorePlayed?: boolean;
	usersBalance: Set<string>;
	playlist?: null;
	timeposition?: 0;
	songPoll?: boolean;
	ready?: boolean;
	sessionStart?: Date;
	isTest?: boolean;
	appPath?: string;
	dataPath?: string;
	resourcePath?: string;
	osURL?: string;
	os?: string;
	osHost?: {
		v4: string;
		v6: string;
	};
	remoteAccess?: RemoteSuccess | RemoteFailure;
	electron?: boolean;
	defaultLocale?: string;
	player?: PlayerState;
	securityCode: number;
	supportedLyrics?: string[];
	supportedMedias?: string[];
	forceDisableAppUpdate?: boolean;
	noAutoTest?: boolean;
	singlePlay?: boolean;
	version?: Version;
	frontendPort?: number;
	binPath?: Partial<BinariesConfig>;
	opt?: {
		cli?: boolean;
		generateDB?: boolean;
		reset?: boolean;
		noBaseCheck?: boolean;
		noPlayer?: boolean;
		strict?: boolean;
		noMedia?: boolean;
		baseUpdate?: boolean;
		mediaUpdateAll?: boolean;
		noBrowser?: boolean;
		sql?: boolean;
		validate?: boolean;
		debug?: boolean;
		forceAdminPassword?: string;
		dumpDB?: boolean;
		restoreDB?: boolean;
		noAutoTest?: boolean;
	};
	args: string[];
	environment: string;
	sentrytest: boolean;
	restoreNeeded: boolean;
	systemMessages: SystemMessage[];
	DBReady: boolean;
	portable: boolean;
	backgrounds?: {
		picture: string;
		music: string;
	};
	quizMode: boolean;
	currentQuizGame?: string;
	quizGuessingTime?: boolean;
	quiz: {
		guessTime: number;
		quickGuess: number;
		revealTime: number;
	};
}

export interface SystemMessage {
	html: string;
	date: string;
	dateStr: string;
	title: string;
	link: string;
	type: string;
}

export interface PublicState {
	currentPlaid: string;
	publicPlaid: string;
	blacklistPlaid: string;
	whitelistPlaid: string;
	fallbackPlaid: string;
	appPath?: string;
	dataPath?: string;
	os?: string;
	defaultLocale: string;
	supportedLyrics?: string[];
	supportedMedias?: string[];
	environment: string;
	sentrytest: boolean;
	url: string;
	quiz: boolean;
	quizGame: string;
}

export interface PublicPlayerState extends PlayerState {
	stopping: boolean;
	currentSong?: CurrentSong;
	currentRequester: string;
	currentSessionID: string;
	defaultLocale: string;
	songsBeforeJingle: number;
	songsBeforeSponsor: number;
	streamerPause: boolean;
}

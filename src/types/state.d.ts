import { PlayerState } from './player';
import { CurrentSong } from './playlist';

export interface Version {
	number?: string,
	name?: string,
	image?: string,
	sha?: string
}

export interface State {
	currentPlaylistID?: number,
	currentSessionID?: string,
	publicPlaylistID?: number,
	playerNeedsRestart?: boolean,
	currentRequester?: string,
	stopping: boolean,
	currentlyPlayingKara?: string,
	currentSong: CurrentSong
	randomPlaying: boolean,
	counterToJingle?: number,
	counterToSponsor?: number,
	introPlayed?: boolean,
	encorePlayed?: boolean,
	fullscreen?: boolean,
	ontop?: boolean,
	playlist?: null,
	timeposition?: 0,
	songPoll?: boolean,
	frontendPort?: number,
	ready?: boolean,
	sessionStart?: Date,
	isDemo?: boolean,
	isTest?: boolean,
	appPath?: string,
	dataPath?: string,
	resourcePath?: string,
	originalAppPath?: string,
	osURL?: string,
	os?: string,
	osHost?: {
		v4: string,
		v6: string
	},
	electron?: boolean,
	defaultLocale?: string,
	player?: PlayerState,
	securityCode: number,
	wsLogNamespace: string,
	supportedLyrics?: string[],
	supportedMedias?: string[],
	forceDisableAppUpdate?: boolean,
	noAutoTest?: boolean,
	singlePlay?: boolean,
	version?: Version,
	binPath?: {
		mpv?: string,
		ffmpeg?: string,
		postgres?: string,
		postgres_ctl?: string,
		postgres_dump?: string,
		postgres_client?: string
	},
	opt?: {
		generateDB?: boolean,
		reset?: boolean,
		noBaseCheck?: boolean,
		noPlayer?: boolean,
		strict?: boolean,
		noMedia?: boolean,
		baseUpdate?: boolean,
		mediaUpdate?: boolean,
		noBrowser?: boolean,
		sql?: boolean,
		validate?: boolean,
		debug?: boolean,
		forceAdminPassword?: string,
		dumpDB?: boolean,
		restoreDB?: boolean
	},
	args: string[],
	environment: string,
	sentrytest: boolean
}

export interface PublicState {
	playing: boolean,
	onTop: boolean,
	fullscreen: boolean,
	timePosition: number,
	stopping: boolean,
	duration: number,
	mute: boolean,
	playerStatus: string,
	currentlyPlaying: string,
	currentRequester: string,
	currentSessionID: string,
	subText: string,
	showSubs: boolean,
	volume: number,
	defaultLocale: string,
	environment: string,
	sentrytest: boolean
}

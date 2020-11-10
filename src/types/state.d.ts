import { PlayerState } from './player';
import { CurrentSong } from './playlist';

export interface Version {
	number?: string,
	name?: string,
	image?: string,
	sha?: string
}

export interface State {
	appHasBeenUpdated?: boolean,
	currentPlaylistID?: number,
	currentSessionID?: string,
	currentSessionEndsAt?: Date,
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
	introSponsorPlayed?: boolean,
	encorePlayed?: boolean,
	fullscreen?: boolean,
	ontop?: boolean,
	playlist?: null,
	timeposition?: 0,
	songPoll?: boolean,
	ready?: boolean,
	sessionStart?: Date,
	isDemo?: boolean,
	isTest?: boolean,
	appPath?: string,
	dataPath?: string,
	resourcePath?: string,
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
	frontendPort?: number,
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
		restoreDB?: boolean,
		noTestDownloads?: boolean,
	},
	args: string[],
	environment: string,
	sentrytest: boolean,
	currentBLCSetID: number
}

export interface PublicState {
	currentPlaylistID: number,
	publicPlaylistID: number,
	appPath?: string,
	dataPath?: string,
	os?: string,
	electron: boolean,
	defaultLocale: string,
	wsLogNamespace: string,
	supportedLyrics?: string[],
	supportedMedias?: string[],
	environment: string,
	sentrytest: boolean
}

export interface PublicPlayerState extends PlayerState {
	onTop: boolean,
	stopping: boolean,
	currentRequester: string,
	currentSessionID: string,
	defaultLocale: string,
	songsBeforeJingle: number,
	songsBeforeSponsor: number
}

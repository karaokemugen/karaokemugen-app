import { PlayerState } from "./player";
import { CurrentSong } from "./playlist";

export interface State {
	currentPlaylistID?: number,
	currentSessionID?: string,
	publicPlaylistID?: number,
	modePlaylistID?: number,
	playerNeedsRestart?: boolean,
	currentRequester?: string,
	currentlyPlayingKara?: string,
	currentSong: CurrentSong
	counterToJingle?: number,
	introPlayed?: boolean,
	encorePlayed?: boolean,
	status?: string,
	private?: boolean,
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
	osURL?: string,
	os?: string,
	osHost?: string
	EngineDefaultLocale?: string,
	player?: PlayerState,
	securityCode: number,
	version?: {
		number?: string,
		name?: string,
		image?: string,
		latest?: string
	},
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
	}
}

export interface PublicState {
	playing: boolean,
	private: boolean,
	status: string,
	onTop: boolean,
	fullscreen: boolean,
	timePosition: number,
	duration: number,
	muteStatus: boolean,
	playerStatus: string,
	currentlyPlaying: string,
	currentRequester: string,
	currentSessionID: string,
	subText: string,
	showSubs: boolean,
	volume: number
}

import {RemoteFailure, RemoteSuccess} from '../lib/types/remote';
import { PlayerState } from './player';

export interface Version {
	number?: string,
	name?: string,
	image?: string,
	sha?: string
}

export interface State {
	appHasBeenUpdated?: boolean,
	currentPlaid?: string,
	currentSessionID?: string,
	currentSessionEndsAt?: Date,
	publicPlaid?: string,
	playerNeedsRestart?: boolean,
	currentRequester?: string,
	stopping: boolean,
	streamerPause: boolean,
	randomPlaying: boolean,
	counterToJingle?: number,
	counterToSponsor?: number,
	introPlayed?: boolean,
	introSponsorPlayed?: boolean,
	encorePlayed?: boolean,
	usersBalance: Set<string>,
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
	remoteAccess?: RemoteSuccess | RemoteFailure
	electron?: boolean,
	defaultLocale?: string,
	player?: PlayerState,
	securityCode: number,
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
		noAutoTest?: boolean,
	},
	args: string[],
	environment: string,
	sentrytest: boolean,
	currentBLCSetID: number
}

export interface PublicState {
	currentPlaid: string,
	publicPlaid: string,
	appPath?: string,
	dataPath?: string,
	os?: string,
	electron: boolean,
	defaultLocale: string,
	supportedLyrics?: string[],
	supportedMedias?: string[],
	environment: string,
	sentrytest: boolean,
	url: string
}

export interface PublicPlayerState extends PlayerState {
	stopping: boolean,
	currentRequester: string,
	currentSessionID: string,
	defaultLocale: string,
	songsBeforeJingle: number,
	songsBeforeSponsor: number,
	streamerPause: boolean
}

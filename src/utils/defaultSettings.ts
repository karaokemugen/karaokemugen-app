// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.yml to bypass the default values.
import { app } from 'electron';
import { z } from 'zod';
import { existsSync } from 'node:fs';

import { hostnameRegexp } from '../lib/utils/constants.js';
import { Config, DBConfig } from '../types/config.js';
import { zArrayOneItem, zBool, zBoolUndefined, zFloat, zInclusion, zInt, zNonEmptyString } from '../lib/utils/validators.js';
import { Repository } from '../lib/types/repo.js';
import { zRepository } from '../lib/dao/repo.js';

export const dbConfig: DBConfig = {
	RestoreNeeded: false,
	bundledPostgresBinary: true,
	database: 'karaokemugen_app',
	host: '',
	socket: '',
	connection: 'socket',
	password: 'musubi',
	port: 6559,
	superuser: 'postgres',
	superuserPassword: null,
	username: 'karaokemugen_app',
};

/** Default configuration */
export const defaults: Config = {
	App: {
		FirstRun: true,
		InstanceID: 'Change me',
		JwtSecret: 'Change me',
	},
	Online: {
		MediasHost: null,
		ErrorTracking: undefined,
		Discord: {
			DisplayActivity: true,
		},
		Updates: {
			Medias: {
				Jingles: true,
				Outros: true,
				Encores: true,
				Intros: true,
				Sponsors: true,
			},
			App: true,
		},
		RemoteAccess: {
			Enabled: true,
			Domain: 'kara.moe',
			Token: 'Change me',
			Secure: true,
		},
		RemoteUsers: {
			Enabled: true,
			DefaultHost: 'kara.moe',
			Secure: true,
		},
		Timeout: 2000,
		FetchPopularSongs: true,
		AllowDownloads: true,
	},
	Frontend: {
		AllowGuestLogin: true,
		AllowCustomTemporaryGuests: false,
		AllowUserCreation: true,
		RequireSecurityCodeForNewAccounts: false,
		Mode: 2,
		PublicPlayerControls: false,
		ShowAvatarsOnPlaylist: true,
		WelcomeMessage: '',
		Library: {
			KaraLineDisplay: [
				{
					type: 'langs',
					display: 'short',
				},
				{
					type: ['displayType', 'series', 'singergroups', 'singers'],
					display: 'i18n',
					style: 'bold',
				},
				{
					type: 'songtypes',
					display: 'short',
				},
				{
					type: 'title',
					display: 'i18n',
					style: 'italic',
				},
				{
					type: 'versions',
					display: 'tag',
				},
				{
					type: 'families',
					display: 'tag',
				},
				{
					type: 'platforms',
					display: 'tag',
				},
				{
					type: 'genres',
					display: 'tag',
				},
				{
					type: 'origins',
					display: 'tag',
				},
				{
					type: 'misc',
					display: 'tag',
				},
				{
					type: 'warnings',
					display: 'tag',
				},
			],
			KaraLineSort: [['series', 'singergroups', 'singers'], 'songtypes', 'langs', 'parents', 'title'],
		},
	},
	GUI: {
		ChibiPlayer: {
			Enabled: false,
			AlwaysOnTop: true,
		},
		ChibiPlaylist: {
			Enabled: false,
			Width: 475,
			Height: 720,
		},
		ChibiRanking: {
			Enabled: false,
			Width: 500,
			Height: 480,
		},
	},
	Karaoke: {
		Autoplay: false,
		ClassicMode: false,
		MinutesBeforeEndOfSessionWarning: 15,
		Poll: {
			Choices: 4,
			Enabled: false,
			Timeout: 30,
		},
		Quota: {
			FreeAutoTime: 60,
			FreeUpVotes: true,
			FreeUpVotesRequiredMin: 3,
			FreeUpVotesRequiredPercent: 33,
			FreeAcceptedSongs: true,
			Songs: 10000,
			Time: 10000,
			Type: 0,
		},
		StreamerMode: {
			Enabled: false,
			PauseDuration: 0,
			Twitch: {
				Enabled: false,
			},
		},
		RestrictInterfaceAtTime: null,
	},
	Player: {
		Display: {
			FontSize: 0,
			Avatar: true,
			Banner: true,
			Nickname: true,
			ConnectionInfo: {
				Enabled: true,
				Host: null,
				Message: '',
				QRCode: false,
				QRCodeDuringSong: false,
			},
			RandomQuotes: true,
			SongInfo: true,
			NextSongInfo: {
				Enabled: true,
				PositionX: 'Center',
				PositionY: 'Center',
			},
		},
		FullScreen: false,
		AudioDevice: 'auto',
		AudioOnlyExperience: false,
		Monitor: false,
		Borders: true,
		ExtraCommandLine: '',
		mpvVideoOutput: '',
		Screen: 0,
		StayOnTop: true,
		PIP: {
			PositionX: 'Right',
			PositionY: 'Bottom',
			Size: 30,
		},
		HardwareDecoding: 'auto-safe',
		KeyboardMediaShortcuts: true,
		Volume: 100,
		AudioDelay: 0,
		LiveComments: false,
		BlurVideoOnWarningTag: false,
	},
	Playlist: {
		AllowDuplicates: false,
		AllowPublicCurrentPlaylistItemSwap: true,
		AllowPublicDuplicates: 'upvotes',
		MaxDejaVuTime: 60,
		Medias: {
			Sponsors: {
				Enabled: true,
				Interval: 50,
			},
			Jingles: {
				Enabled: true,
				Interval: 20,
			},
			Intros: {
				Enabled: true,
				Message: null,
			},
			Encores: {
				Enabled: true,
				Message: null,
			},
			Outros: {
				Enabled: true,
				Message: null,
			},
		},
		MysterySongs: {
			AddedSongVisibilityAdmin: true,
			AddedSongVisibilityPublic: true,
			Hide: false,
			Labels: ['???'],
		},
		EndOfPlaylistAction: 'none',
		RandomSongsAfterEndMessage: true,
		CurrentPlaylistAutoRemoveSongs: 0,
	},
	System: {
		FrontendPort: 1337,
		Database: dbConfig,
		Binaries: {
			Player: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE || existsSync('app/bin/mpv') ? 'app/bin/mpv' : '/usr/bin/mpv',
				OSX: app?.isPackaged
					? 'Karaoke Mugen.app/Contents/app/bin/mpv.app/Contents/MacOS/mpv'
					: 'app/bin/mpv.app/Contents/MacOS/mpv',
				Windows: 'app\\bin\\mpv.exe',
			},
			ffmpeg: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE || existsSync('app/bin/ffmpeg')
						? 'app/bin/ffmpeg'
						: '/usr/bin/ffmpeg',
				OSX: app?.isPackaged ? 'Karaoke Mugen.app/Contents/app/bin/ffmpeg' : 'app/bin/ffmpeg',
				Windows: 'app\\bin\\ffmpeg.exe',
			},
			Postgres: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE || existsSync('app/bin/postgres/bin/')
						? 'app/bin/postgres/bin/'
						: '/usr/bin/',
				OSX: app?.isPackaged ? 'Karaoke Mugen.app/Contents/app/bin/postgres/bin/' : 'app/bin/postgres/bin/',
				Windows: 'app\\bin\\postgres\\bin\\',
			},
			patch: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE || existsSync('app/bin/patch')
						? 'app/bin/patch'
						: '/usr/bin/patch',
				OSX: app?.isPackaged ? 'Karaoke Mugen.app/Contents/app/bin/patch' : 'app/bin/patch',
				Windows: 'app\\bin\\patch.exe',
			},
		},
		Repositories: [],
		MediaPath: {
			Encores: ['encores'],
			Intros: ['intros'],
			Jingles: ['jingles'],
			Outros: ['outros'],
			Sponsors: ['sponsors'],
		},
		Path: {
			Avatars: 'avatars',
			Backgrounds: 'backgrounds',
			BundledBackgrounds: 'bundledBackgrounds',
			Bin: 'bin',
			DB: 'db',
			Fonts: 'fonts',
			Import: 'import',
			Previews: 'previews',
			SessionExports: 'sessionExports',
			StreamFiles: 'streamFiles',
			SSHKeys: 'sshKeys',
		},
	},
};

export const horizontalPosArray = ['Left', 'Right', 'Center'];
export const verticalPosArray = ['Top', 'Bottom', 'Center'];
export const hwdecModes = ['auto-safe', 'no', 'yes'];
export const endOfPlaylistActions = ['random', 'random_fallback', 'play_fallback', 'repeat', 'none'];

/** Config constraints. */
export const configConstraints = z
	.object({
		App: z
			.object({
				FirstRun: zBool,
			})
			.loose(),
		Online: z
			.object({
				ErrorTracking: zBoolUndefined,
				RemoteAccess: z
					.object({
						Enabled: zBool,
						Secure: zBool,
						Domain: zNonEmptyString.regex(hostnameRegexp),
					})
					.loose(),
				Timeout: zInt({ min: 0 }),
				RemoteUsers: z
					.object({
						Enabled: zBool,
						DefaultHost: z.string().regex(hostnameRegexp).optional(),
						Secure: zBool,
					})
					.loose(),
				Discord: z.object({ DisplayActivity: zBool }).loose(),
				Updates: z
					.object({
						Medias: z
							.object({
								Jingles: zBool,
								Outros: zBool,
								Encores: zBool,
								Intros: zBool,
							})
							.loose(),
						App: zBool,
					})
					.loose(),
			})
			.loose(),
		Frontend: z
			.object({
				Mode: zInt({ min: 0, max: 2 }),
				ShowAvatarsOnPlaylist: zBool,
			})
			.loose(),
		Karaoke: z
			.object({
				Autoplay: zBool,
				ClassicMode: zBool,
				MinutesBeforeEndOfSessionWarning: zInt({ min: 0 }),
				StreamerMode: z
					.object({
						Enabled: zBool,
						PauseDuration: zInt({ min: 0 }),
						Twitch: z.object({ Enabled: zBool }).loose(),
					})
					.loose(),
				Poll: z
					.object({
						Choices: zInt({ min: 1 }),
						Timeout: zInt({ min: 1 }),
						Enabled: zBool,
					})
					.loose(),
				Quota: z
					.object({
						Type: zInt({ min: 0, max: 2 }),
						FreeUpVotes: zBool,
						FreeAutoTime: zInt({ min: 0 }),
						FreeUpVotesRequiredMin: zInt({ min: 1 }),
						FreeUpVotesRequiredPercent: zInt({ min: 1, max: 100 }),
						Songs: z.number().int(),
						Time: z.number().int(),
					})
					.loose(),
			})
			.loose(),
		Player: z
			.object({
				Display: z
					.object({
						Avatar: zBool,
						Nickname: zBool,
						ConnectionInfo: z
							.object({
								Enabled: zBool,
								QRCode: zBool,
								Message: z.string(),
							})
							.loose(),
					})
					.loose(),
				FullScreen: zBool,
				Monitor: zBool,
				StayOnTop: zBool,
				Screen: zInt({ min: 0 }),
				PIP: z
					.object({
						PositionX: zInclusion(horizontalPosArray),
						PositionY: zInclusion(verticalPosArray),
						Size: zInt({ min: 0, max: 100 }),
					})
					.loose(),
				Volume: zFloat({ min: 0, max: 100 }),
				AudioDelay: zFloat({ min: -5000, max: 5000 }),
				HardwareDecoding: zInclusion(hwdecModes),
			})
			.loose(),
		Playlist: z
			.object({
				AllowDuplicates: zBool,
				MaxDejaVuTime: zInt({ min: 1 }),
				Medias: z
					.object({
						Intros: z.object({ Enabled: zBool }).loose(),
						Sponsors: z
							.object({ Enabled: zBool, Interval: zInt({ min: 1 }) })
							.loose(),
						Outros: z.object({ Enabled: zBool }).loose(),
						Encores: z.object({ Enabled: zBool }).loose(),
						Jingles: z
							.object({ Enabled: zBool, Interval: zInt({ min: 1 }) })
							.loose(),
					})
					.loose(),
				MysterySongs: z
					.object({
						Hide: zBool,
						AddedSongVisibilityAdmin: zBool,
						AddedSongVisibilityPublic: zBool,
						Labels: zArrayOneItem,
					})
					.loose(),
				EndOfPlaylistAction: zInclusion(endOfPlaylistActions),
				RandomSongsAfterEndMessage: zBool,
				CurrentPlaylistAutoRemoveSongs: zInt({ min: 0 }),
			})
			.loose(),
		System: z
			.object({
				Binaries: z
					.object({
						Player: z
							.object({
								Linux: zNonEmptyString,
								Windows: zNonEmptyString,
								OSX: zNonEmptyString,
							})
							.loose(),
						ffmpeg: z
							.object({
								Linux: zNonEmptyString,
								Windows: zNonEmptyString,
								OSX: zNonEmptyString,
							})
							.loose(),
						Postgres: z
							.object({
								Linux: zNonEmptyString,
								Windows: zNonEmptyString,
								OSX: zNonEmptyString,
							})
							.loose(),
					})
					.loose(),
				Path: z
					.object({
						Avatars: zNonEmptyString,
						Backgrounds: zNonEmptyString,
						Bin: zNonEmptyString,
						DB: zNonEmptyString,
						Previews: zNonEmptyString,
						Import: zNonEmptyString,
					})
					.loose(),
				MediaPath: z
					.object({
						Encores: zArrayOneItem,
						Jingles: zArrayOneItem,
						Intros: zArrayOneItem,
						Sponsors: zArrayOneItem,
						Outros: zArrayOneItem,
					})
					.loose(),
				Repositories: z.array(zRepository),
			})
			.loose(),
	})
	.loose();

export const defaultRepositories: Repository[] = [
	{
		Name: 'kara.moe',
		Online: true,
		Secure: true,
		Update: true,
		Enabled: true,
		SendStats: true,
		AutoMediaDownloads: 'updateOnly',
		MaintainerMode: false,
		BaseDir: process.platform === 'win32' ? 'repos\\kara.moe\\json' : 'repos/kara.moe/json',
		Path:
			process.platform === 'win32'
				? {
						Medias: ['repos\\kara.moe\\medias'],
					}
				: {
						Medias: ['repos/kara.moe/medias'],
					},
	},
	{
		Name: 'My Custom Songs',
		Online: false,
		Enabled: true,
		BaseDir: process.platform === 'win32' ? 'repos\\My Custom Songs\\json' : 'repos/My Custom Songs/json',
		MaintainerMode: false,
		Path:
			process.platform === 'win32'
				? {
						Medias: ['repos\\My Custom Songs\\medias'],
					}
				: {
						Medias: ['repos/My Custom Songs/medias'],
					},
	},
];

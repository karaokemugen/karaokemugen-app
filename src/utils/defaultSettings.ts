// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.yml to bypass the default values.
import { app } from 'electron';
import { existsSync } from 'node:fs';
import { z } from 'zod';

import { hostnameRegexp, karaLineDisplayType, karaLineElement, karaSortType, pathType, playlistMediaTypes, positionX, positionY, styleFontType } from '../lib/utils/constants.js';
import { Config, DBConfig } from '../types/config.js';
import { zNonEmptyString } from '../lib/utils/validators.js';
import { Repository } from '../lib/types/repo.js';
import { zRepository } from '../lib/dao/repo.js';
import { endOfPlaylistActions } from './constants.js';

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
			Domain: 'mugen.re',
			Token: 'Change me',
			Secure: true,
		},
		RemoteUsers: {
			Enabled: true,
			DefaultHost: 'mugen.re',
			Secure: true,
		},
		Timeout: 2000,
		FetchPopularSongs: true,
		AllowDownloads: true,
		UplinkServer: {
			Domain: 'mugen.re',
			Secure: true
		}
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
			SongInfoPermanent: false,
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

export const hwdecModes = ['auto-safe', 'no', 'yes'];

/** Config constraints. */
export const configConstraints = z
	.object({
		App: z
			.object({
				FirstRun: z.coerce.boolean(),
				JwtSecret: zNonEmptyString,
				InstanceID: z.union([z.literal('Change me'), z.uuidv4()]),
				Language: z.string().nullish().optional(),
			})
			.loose(),
		Online: z
			.object({
				Timeout: z.coerce.number().int().min(0),
				ErrorTracking: z.coerce.boolean().optional(),
				FetchPopularSongs: z.coerce.boolean().optional(),
				AllowDownloads: z.coerce.boolean().optional(),
				RemoteAccess: z
					.object({
						Enabled: z.coerce.boolean(),
						Secure: z.coerce.boolean(),
						Domain: zNonEmptyString.regex(hostnameRegexp),
					}),					
				RemoteUsers: z
					.object({
						Enabled: z.coerce.boolean().optional(),
						DefaultHost: z.string().regex(hostnameRegexp).nullish().optional(),
						Secure: z.coerce.boolean().optional(),						
					})
					.loose(),
				Discord: z.object({ DisplayActivity: z.coerce.boolean().optional()}).loose(),
				Updates: z
					.object({
						Medias: z
							.object({
								Jingles: z.coerce.boolean().optional(),
								Outros: z.coerce.boolean().optional(),
								Encores: z.coerce.boolean().optional(),
								Intros: z.coerce.boolean().optional(),
								Sponsors: z.coerce.boolean().optional(),
							})
							.loose(),
						App: z.coerce.boolean().optional(),
					})
					.loose(),
			})
			.loose(),
		Frontend: z
			.object({
				Mode: z.coerce.number().int().min(0).max(2),
				ShowAvatarsOnPlaylist: z.coerce.boolean().optional(),
				AllowGuestLogin: z.coerce.boolean().optional(),
				AllowCustomTemporaryGuests: z.coerce.boolean().optional(),
				AllowUserCreation: z.coerce.boolean().optional(),
				RequireSecurityCodeForNewAccounts: z.coerce.boolean().optional(),
				PublicPlayerControls: z.coerce.boolean().optional(),
				WelcomeMessage: z.string().nullish().optional(),
				Library: z.object({
					KaraLineDisplay: z.array(
						z.object({
							type: z.union([
								z.enum(karaLineElement),
								z.array(z.enum(karaLineElement))
							]),
							display: z.enum(karaLineDisplayType),
							style: z.enum(styleFontType).optional(),
						}).loose(),
					).optional(),
					KaraLineSort: z.array(
						z.union([
							z.enum(karaSortType),
							z.array(z.enum(karaSortType))
						])
					).optional(),
				}).loose(),
			})
			.loose(),
		GUI: z.object({
			ChibiPlayer: z.object({
				Enabled: z.coerce.boolean().optional(),
				AlwaysOnTop: z.coerce.boolean().optional(),
				PositionX: z.coerce.number().int().min(0).optional(),
				PositionY: z.coerce.number().int().min(0).optional(),
			}).loose(),
			ChibiPlaylist: z.object({
				Enabled: z.coerce.boolean().optional(),
				Width: z.coerce.number().int().min(0).optional(),
				Height: z.coerce.number().int().min(0).optional(),
				PositionX: z.coerce.number().int().min(0).optional(),
				PositionY: z.coerce.number().int().min(0).optional(),
			}).loose(),
			ChibiRanking: z.object({
				Enabled: z.coerce.boolean().optional(),
				Width: z.coerce.number().int().min(0).optional(),
				Height: z.coerce.number().int().min(0).optional(),
				PositionX: z.coerce.number().int().min(0).optional(),
				PositionY: z.coerce.number().int().min(0).optional(),
			}).loose(),
		}).loose(),
		Karaoke: z
			.object({
				Collections: z.record(z.uuidv4(), z.coerce.boolean()).optional(),
				Autoplay: z.coerce.boolean().optional(),
				AutoBalance: z.coerce.boolean().optional(),
				ClassicMode: z.coerce.boolean().optional(),
				MinutesBeforeEndOfSessionWarning: z.coerce.number().int().min(0).optional(),
				RestrictInterfaceAtTime: z.iso.datetime({offset: true}).nullish().optional(),
				StreamerMode: z
					.object({
						Enabled: z.coerce.boolean().optional(),
						PauseDuration: z.coerce.number().int().min(0).optional(),
						Twitch: z.object({ 
							Enabled: z.coerce.boolean().optional(),
							OAuth: z.string().nullish().optional(),
							Channel: z.string().nullish().optional(),
						}).loose(),
					})
					.loose(),
				Poll: z
					.object({
						Choices: z.coerce.number().int().min(1).optional(),
						Timeout: z.coerce.number().int().min(1).optional(),
						Enabled: z.coerce.boolean().optional(),
					})
					.loose(),
				Quota: z
					.object({
						Type: z.coerce.number().int().min(0).max(2).optional(),
						FreeUpVotes: z.coerce.boolean().optional(),
						FreeAutoTime: z.coerce.number().int().min(0).optional(),
						FreeUpVotesRequiredMin: z.coerce.number().int().min(1).optional(),
						FreeUpVotesRequiredPercent: z.coerce.number().int().min(1).max(100).optional(),
						FreeAcceptedSongs: z.coerce.boolean().optional(),
						Songs: z.coerce.number().int().min(0).optional(),
						Time: z.coerce.number().int().min(0).optional(),
					})
					.loose(),
			})
			.loose(),
		Player: z
			.object({
				Display: z
					.object({
						Avatar: z.coerce.boolean().optional(),
						Nickname: z.coerce.boolean().optional(),
						FontSize: z.coerce.number().int().min(0).optional(),
						Banner: z.coerce.boolean().optional(),
						RandomQuotes: z.coerce.boolean().optional(),
						SongInfo: z.coerce.boolean().optional(),
						SongInfoPermanent: z.coerce.boolean().optional(),
						SongInfoLanguage: z.string().nullish().optional(),
						NextSongInfo: z.object({
							Enabled: z.coerce.boolean().optional(),
							PositionX: z.enum(positionX),
							PositionY: z.enum(positionY),
						}).loose(),										
						ConnectionInfo: z
							.object({
								Enabled: z.coerce.boolean().optional(),
								QRCode: z.coerce.boolean().optional(),
								QRCodeDuringSong: z.coerce.boolean().optional(),
								Host: z.string().nullish().optional(),
								Message: z.string().nullish().optional(),
							})
							.loose(),
					})
					.loose(),
				FullScreen: z.coerce.boolean().optional(),
				Monitor: z.coerce.boolean().optional(),
				StayOnTop: z.coerce.boolean().optional(),
				Screen: z.coerce.number().int().min(0).optional(),
				PIP: z
					.object({
						PositionX: z.enum(positionX).optional(),
						PositionY: z.enum(positionY).optional(),
						Size: z.coerce.number().int().min(1).max(100),
					})
					.loose(),
				ExtraCommandLine: z.string().nullish().optional(),
				Borders: z.coerce.boolean().optional(),
				Volume: z.coerce.number().min(0).max(100).optional(),
				AudioDelay: z.coerce.number().min(-5000).max(5000).optional(),
				HardwareDecoding: z.enum(hwdecModes).optional(),
				KeyboardMediaShortcuts: z.coerce.boolean().optional(),
				AudioMute: z.coerce.boolean().optional(),
				LiveComments: z.coerce.boolean().optional(),
				BlurVideoOnWarningTag: z.coerce.boolean().optional(),
				AudioOnlyExperience: z.coerce.boolean().optional(),
			})
			.loose(),
		Playlist: z
			.object({
				AllowDuplicates: z.coerce.boolean().optional(),
				AllowPublicCurrentPlaylistItemSwap: z.coerce.boolean().optional(),
				AllowPublicDuplicates: z.coerce.boolean().optional(),
				MaxDejaVuTime: z.coerce.number().int().min(1),
				Medias: z
					.object({
						Intros: z.object({ Enabled: z.coerce.boolean(), Message: z.string().nullish().optional() }).loose(),
						Sponsors: z
							.object({ Enabled: z.coerce.boolean(), Interval: z.coerce.number().int().min(1) })
							.loose(),
						Outros: z.object({ Enabled: z.coerce.boolean(), Message: z.string().nullish().optional() }).loose(),
						Encores: z.object({ Enabled: z.coerce.boolean(), Message: z.string().nullish().optional() }).loose(),
						Jingles: z
							.object({ Enabled: z.coerce.boolean(), Interval: z.coerce.number().int().min(1) })
							.loose(),
					})
					.loose(),
				MysterySongs: z
					.object({
						Hide: z.coerce.boolean().optional(),
						AddedSongVisibilityAdmin: z.coerce.boolean().optional(),
						AddedSongVisibilityPublic: z.coerce.boolean().optional(),
						Labels: z.array(z.string().nullish()).min(1),
					})
					.loose(),
				EndOfPlaylistAction: z.enum(endOfPlaylistActions),
				RandomSongsAfterEndMessage: z.coerce.boolean(),
				CurrentPlaylistAutoRemoveSongs: z.coerce.number().int().min(0),
			})
			.loose(),
		System: z
			.object({
				SystemRepositoryMaintenance: z.coerce.boolean().optional(),	
				FrontendPort: z.coerce.number().int().min(1).max(65535),				
				Database: z.object({
						RestoreNeeded: z.coerce.boolean().optional(),
						bundledPostgresBinary: z.coerce.boolean().optional(),
						database: z.string().nullish(),
						host: z.string().nullish().optional(),
						socket: z.string().nullish().optional(),
						connection: z.enum(['socket', 'tcp']),
						password: z.string().nullish(),
						port: z.coerce.number().int().min(1).max(65535).optional(),
						superuser: z.string().nullish(),
						superuserPassword: z.string().nullish().optional(),
						username: z.string().nullish(),
				}).loose(),
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
						patch: z
							.object({
								Linux: zNonEmptyString,
								Windows: zNonEmptyString,
								OSX: zNonEmptyString,
							})
							.loose(),
					})
					.loose(),
				Path: z.record(z.enum(pathType), z.string().nullish()),
				MediaPath: z.record(z.enum(playlistMediaTypes), z.array(z.string())),
				Repositories: z.array(zRepository),
			})
			.loose(),
	})
	.loose();

export const defaultRepositories: Repository[] = [
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

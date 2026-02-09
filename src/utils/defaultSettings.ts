// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.yml to bypass the default values.
import { app } from 'electron';

import { Repository } from '../lib/types/repo.js';
import { bools, hostnameRegexp } from '../lib/utils/constants.js';
import { Config, DBConfig } from '../types/config.js';

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
			Avatar: true,
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
					app?.isPackaged || process.env.container || process.env.APPIMAGE ? 'app/bin/mpv' : '/usr/bin/mpv',
				OSX: app?.isPackaged
					? 'Karaoke Mugen.app/Contents/app/bin/mpv.app/Contents/MacOS/mpv'
					: 'app/bin/mpv.app/Contents/MacOS/mpv',
				Windows: 'app\\bin\\mpv.exe',
			},
			ffmpeg: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE
						? 'app/bin/ffmpeg'
						: '/usr/bin/ffmpeg',
				OSX: app?.isPackaged ? 'Karaoke Mugen.app/Contents/app/bin/ffmpeg' : 'app/bin/ffmpeg',
				Windows: 'app\\bin\\ffmpeg.exe',
			},
			Postgres: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE
						? 'app/bin/postgres/bin/'
						: '/usr/bin/',
				OSX: app?.isPackaged ? 'Karaoke Mugen.app/Contents/app/bin/postgres/bin/' : 'app/bin/postgres/bin/',
				Windows: 'app\\bin\\postgres\\bin\\',
			},
			patch: {
				Linux:
					app?.isPackaged || process.env.container || process.env.APPIMAGE
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
export const configConstraints = {
	'App.FirstRun': { inclusion: bools },
	// 'App.InstanceID': {presence: true, format: uuidRegexp}, // Broken on regular installations since InstanceID is stored in database. We'll implement this in KM 10.0 aka KMX
	'Online.ErrorTracking': { boolUndefinedValidator: true },
	'Online.RemoteAccess.Enabled': { inclusion: bools },
	'Online.RemoteAccess.Secure': { inclusion: bools },
	'Online.RemoteAccess.Domain': { presence: true, format: hostnameRegexp },
	'Online.Timeout': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'Online.RemoteUsers.Enabled': { inclusion: bools },
	'Online.RemoteUsers.DefaultHost': { format: hostnameRegexp },
	'Online.RemoteUsers.Secure': { inclusion: bools },
	'Online.Discord.DisplayActivity': { inclusion: bools },
	'Online.Updates.Medias.Jingles': { inclusion: bools },
	'Online.Updates.Medias.Outros': { inclusion: bools },
	'Online.Updates.Medias.Encores': { inclusion: bools },
	'Online.Updates.Medias.Intros': { inclusion: bools },
	'Online.Updates.App': { inclusion: bools },
	'Frontend.Mode': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2 } },
	'System.FrontendPort': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'Frontend.ShowAvatarsOnPlaylist': { inclusion: bools },
	'Karaoke.Autoplay': { inclusion: bools },
	'Karaoke.ClassicMode': { inclusion: bools },
	'Karaoke.MinutesBeforeEndOfSessionWarning': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'Karaoke.StreamerMode.Enabled': { inclusion: bools },
	'Karaoke.StreamerMode.PauseDuration': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'Karaoke.StreamerMode.Twitch.Enabled': { inclusion: bools },
	'Karaoke.Poll.Choices': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 1 } },
	'Karaoke.Poll.Timeout': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 1 } },
	'Karaoke.Poll.Enabled': { inclusion: bools },
	'Karaoke.Quota.Type': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2 } },
	'Karaoke.Quota.FreeUpVotes': { inclusion: bools },
	'Karaoke.Quota.FreeAutoTime': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'Karaoke.Quota.FreeUpVotesRequiredMin': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 1 } },
	'Karaoke.Quota.FreeUpVotesRequiredPercent': {
		numericality: { onlyInteger: true, greaterThanOrEqualTo: 1, lowerThanOrEqualTo: 100 },
	},
	'Karaoke.Quota.Songs': { numericality: { onlyInteger: true } },
	'Karaoke.Quota.Time': { numericality: { onlyInteger: true } },
	'Player.Display.Avatar': { inclusion: bools },
	'Player.Display.Nickname': { inclusion: bools },
	'Player.Display.ConnectionInfo.Enabled': { inclusion: bools },
	'Player.Display.ConnectionInfo.QRCode': { inclusion: bools },
	'Player.Display.ConnectionInfo.Message': { presence: { allowEmpty: true } },
	'Player.FullScreen': { inclusion: bools },
	'Player.Monitor': { inclusion: bools },
	'Player.StayOnTop': { inclusion: bools },
	'Player.Screen': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'Player.PIP.PositionX': { inclusion: horizontalPosArray },
	'Player.PIP.PositionY': { inclusion: verticalPosArray },
	'Player.PIP.Size': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 100 } },
	'Player.Volume': { numericality: { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 100 } },
	'Player.AudioDelay': { numericality: { greaterThanOrEqualTo: -5000, lessThanOrEqualTo: 5000 } },
	'Player.HardwareDecoding': { inclusion: hwdecModes },
	'Playlist.AllowDuplicates': { inclusion: bools },
	'Playlist.MaxDejaVuTime': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 1 } },
	'Playlist.Medias.Intros.Enabled': { inclusion: bools },
	'Playlist.Medias.Sponsors.Enabled': { inclusion: bools },
	'Playlist.Medias.Sponsors.Interval': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 1 } },
	'Playlist.Medias.Outros.Enabled': { inclusion: bools },
	'Playlist.Medias.Encores.Enabled': { inclusion: bools },
	'Playlist.Medias.Jingles.Enabled': { inclusion: bools },
	'Playlist.Medias.Jingles.Interval': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 1 } },
	'Playlist.MysterySongs.Hide': { inclusion: bools },
	'Playlist.MysterySongs.AddedSongVisibilityAdmin': { inclusion: bools },
	'Playlist.MysterySongs.AddedSongVisibilityPublic': { inclusion: bools },
	'Playlist.MysterySongs.Labels': { arrayOneItemValidator: true },
	'Playlist.EndOfPlaylistAction': { inclusion: endOfPlaylistActions },
	'Playlist.RandomSongsAfterEndMessage': { inclusion: bools },
	'Playlist.CurrentPlaylistAutoRemoveSongs': { numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 } },
	'System.Binaries.Player.Linux': { presence: true },
	'System.Binaries.Player.Windows': { presence: true },
	'System.Binaries.Player.OSX': { presence: true },
	'System.Binaries.ffmpeg.Linux': { presence: true },
	'System.Binaries.ffmpeg.Windows': { presence: true },
	'System.Binaries.ffmpeg.OSX': { presence: true },
	'System.Binaries.Postgres.Linux': { presence: true },
	'System.Binaries.Postgres.Windows': { presence: true },
	'System.Binaries.Postgres.OSX': { presence: true },
	'System.Path.Avatars': { presence: true },
	'System.Path.Backgrounds': { presence: true },
	'System.Path.Bin': { presence: true },
	'System.Path.DB': { presence: true },
	'System.MediaPath.Encores': { arrayOneItemValidator: true },
	'System.MediaPath.Jingles': { arrayOneItemValidator: true },
	'System.MediaPath.Intros': { arrayOneItemValidator: true },
	'System.MediaPath.Sponsors': { arrayOneItemValidator: true },
	'System.MediaPath.Outros': { arrayOneItemValidator: true },
	'System.Path.Previews': { presence: true },
	'System.Path.Import': { presence: true },
	'System.Repositories': { repositoriesValidator: true },
};

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

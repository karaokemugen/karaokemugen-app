

// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.yml to bypass the default values.
import {Config} from '../types/config';
import { bools } from '../lib/utils/constants';

/** Default configuration */
export const defaults: Config = {
	App: {
		FirstRun: true,
		JwtSecret: 'Change me'
	},
	Database: {
		'sql-file': true,
		defaultEnv: 'prod',
		prod: {
			bundledPostgresBinary: true,
			database: 'karaokemugen_app',
			driver: 'pg',
			host: 'localhost',
			password: 'musubi',
			port: 6559,
			schema: 'public',
			superuser: 'postgres',
			superuserPassword: null,
			user: 'karaokemugen_app'
		}
	},
	Online: {
		Host: 'kara.moe',
		IntrosUpdate: true,
		JinglesUpdate: true,
		MediasHost: undefined,
		Port: undefined,
		Stats: undefined,
		URL: true,
		Users: true,
		Updates: true
	},
	Frontend: {
		AuthExpireTime: 15,
		Mode: 2,
		Port: 1337,
		SeriesLanguageMode: 3
		Permissions: {
			AllowNicknameChange: true,
			AllowViewBlacklist: true,
			AllowViewBlacklistCriterias: true,
			AllowViewWhitelist: true,
		},
	},
	Gitlab: {
		Enabled: true,
		Host: 'lab.shelter.moe',
		ProjectID: 2,
		// This is a reporter-only access token, nothing of value is here.
		Token: 'i5WnabG3fvda4oxx-FRb',
		IssueTemplate: {
			Suggestion: {
				Labels: ['à intégrer']
			}
		}
	},
	Karaoke: {
		Autoplay: false,
		ClassicMode: false,
		JinglesInterval: 20,
		Private: true,
		Repeat: false,
		SmartInsert: false,
		Display: {
			Avatar: true,
			Nickname: true,
			ConnectionInfo: {
				Enabled: true,
				Host: null,
				Message: ''
			}
		},
		Poll: {
			Choices: 4,
			Enabled: false,
			Timeout: 30
		},
		Quota: {
			FreeAutoTime: 60,
			FreeUpVotes: true,
			FreeUpVotesRequiredMin: 3,
			FreeUpVotesRequiredPercent: 33,
			Songs: 10000,
			Time: 10000,
			Type: 0
		},
		StreamerMode: {
			Enabled: false,
			PauseDuration: 0,
			Twitch: {
				Enabled: false
			}
		}
	},
	Player: {
		Background: '',
		FullScreen: false,
		Monitor: false,
		mpvVideoOutput: '',
		NoBar: true,
		NoHud: true,
		Screen: 0,
		StayOnTop: true,
		VisualizationEffects: false,
		PIP: {
			Enabled: true,
			PositionX: 'Right',
			PositionY: 'Bottom',
			Size: 30,
		}
	},
	Playlist: {
		AllowDuplicates: false,
		AllowDuplicateSeries: true,
		IntroVideos: true,
		IntroVideoFile: null,
		MaxDejaVuTime: 60,
		RemovePublicOnPlay: false,
		MysterySongs: {
			AddedSongVisibilityAdmin: true,
			AddedSongVisibilityPublic: true,
			Hide: false,
			Labels: [
				'???',
			]
		}
	},
	System: {
		Binaries: {
			Player: {
				Linux: '/usr/bin/mpv',
				OSX: 'app/bin/mpv.app/Contents/MacOS/mpv',
				Windows: 'app/bin/mpv.exe'
			},
			ffmpeg: {
				Linux: '/usr/bin/ffmpeg',
				OSX: 'app/bin/ffmpeg',
				Windows: 'app/bin/ffmpeg.exe'
			},
			Postgres: {
				Linux: 'app/bin/postgres/bin/',
				OSX: 'app/bin/postgres/bin/',
				Windows: 'app/bin/postgres/bin/'
			}
		},
		Path: {
			Avatars: 'app/avatars',
			Backgrounds: ['app/backgrounds'],
			Bin: 'app/bin',
			DB: 'app/db',
			Import: 'app/import',
			Intros: ['app/intros', 'app/intros/KaraokeMugen'],
			Jingles: ['app/jingles', 'app/jingles/KaraokeMugen'],
			Karas: ['app/data/karaokes'],
			Lyrics: ['app/data/lyrics'],
			Medias: ['app/data/medias'],
			Previews: 'app/previews',
			Series: ['app/data/series'],
			Tags: ['app/data/tags'],
			Temp: 'app/temp'
		}
	}
};

const horizontalPosArray = ['Left', 'Right', 'Center'];
const verticalPosArray = ['Top', 'Bottom', 'Center'];

/** Config constraints. */
export const configConstraints = {
	'App.FirstRun': {inclusion : bools},
	'Online.Stats': {boolUndefinedValidator: true},
	'Online.Host': {presence: true},
	'Online.URL': {inclusion : bools},
	'Online.Users': {inclusion : bools},
	'Online.Updates': {inclusion : bools},
	'Online.JinglesUpdate': {inclusion : bools},
	'Online.IntrosUpdate': {inclusion : bools},
	'Online.LatestURL': {type: 'string'},
	'Frontend.Permissions.AllowNicknameChange': {inclusion : bools},
	'Frontend.Permissions.AllowViewBlacklist': {inclusion : bools},
	'Frontend.Permissions.AllowViewBlacklistCriterias': {inclusion : bools},
	'Frontend.Permissions.AllowViewWhitelist': {inclusion : bools},
	'Frontend.AuthExpireTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Frontend.Mode': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2}},
	'Frontend.SeriesLanguageMode': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 3}},
	'Karaoke.Autoplay': {inclusion : bools},
	'Karaoke.ClassicMode': {inclusion : bools},
	'Karaoke.StreamerMode.Enabled': {inclusion: bools},
	'Karaoke.StreamerMode.PauseDuration': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Karaoke.Private': {inclusion : bools},
	'Karaoke.Repeat': {inclusion : bools},
	'Karaoke.SmartInsert': {inclusion : bools},
	'Karaoke.JinglesInterval': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Karaoke.Poll.Choices': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Poll.Timeout': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Poll.Enabled': {inclusion : bools},
	'Karaoke.Quota.Type': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2}},
	'Karaoke.Quota.FreeUpVotes': {inclusion : bools},
	'Karaoke.Quota.FreeAutoTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Quota.FreeUpVotesRequiredMin': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Quota.FreeUpVotesRequiredPercent': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1, lowerThanOrEqualTo: 100}},
	'Karaoke.Quota.Songs': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Quota.Time': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Display.Avatar': {inclusion : bools},
	'Karaoke.Display.Nickname': {inclusion : bools},
	'Karaoke.Display.ConnectionInfo.Enabled': {inclusion : bools},
	'Karaoke.Display.ConnectionInfo.QRCode': {inclusion : bools},
	'Karaoke.Display.ConnectionInfo.Message': {presence: {allowEmpty: true}},
	'Player.FullScreen': {inclusion : bools},
	'Player.Monitor': {inclusion : bools},
	'Player.NoBar': {inclusion : bools},
	'Player.NoHud': {inclusion : bools},
	'Player.StayOnTop': {inclusion : bools},
	'Player.Screen': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Player.VisualizationEffects': {inclusion : bools},
	'Player.PIP.Enabled': {inclusion : bools},
	'Player.PIP.PositionX': {inclusion : horizontalPosArray},
	'Player.PIP.PositionY': {inclusion : verticalPosArray},
	'Player.PIP.Size': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 100}},
	'Playlist.AllowDuplicates': {inclusion : bools},
	'Playlist.AllowDuplicateSeries': {inclusion : bools},
	'Playlist.RemovePublicOnPlay': {inclusion : bools},
	'Playlist.MaxDejaVuTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Playlist.IntroVideos': {inclusion: bools},
	'Playlist.MysterySongs.Hide': {inclusion: bools},
	'Playlist.MysterySongs.AddedSongVisibilityAdmin': {inclusion: bools},
	'Playlist.MysterySongs.AddedSongVisibilityPublic': {inclusion: bools},
	'Playlist.MysterySongs.Labels': {arrayOneItemValidator: true}
};

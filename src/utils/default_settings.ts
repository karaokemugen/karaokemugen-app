

// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.yml to bypass the default values.
import {Config} from '../types/config';
import { bools } from '../lib/utils/constants';

/** Default configuration */
export const defaults: Config = {
	App: {
		FirstRun: true,
		InstanceID: 'Change me',
		JwtSecret: 'Change me'
	},
	Database: {
		'sql-file': true,
		defaultEnv: 'prod',
		prod: {
			driver: 'pg',
			user: 'karaokemugen_app',
			password: 'musubi',
			host: 'localhost',
			port: 6559,
			database: 'karaokemugen_app',
			schema: 'public',
			superuser: 'postgres',
			superuserPassword: null,
			bundledPostgresBinary: true
		}
	},
	Online: {
		Host: 'kara.moe',
		Port: undefined,
		Stats: undefined,
		URL: true,
		Users: true
	},
	Frontend: {
		AuthExpireTime: 15,
		Mode: 2,
		Port: 1337,
		Permissions: {
			AllowNicknameChange: true,
			AllowViewBlacklist: true,
			AllowViewBlacklistCriterias: true,
			AllowViewWhitelist: true,
		},
		SeriesLanguageMode: 3
	},
	Gitlab: {
		Enabled: false
	},
	Karaoke: {
		Autoplay: false,
		JinglesInterval: 20,
		Private: true,
		Repeat: false,
		SmartInsert: false,
		Display: {
			Avatar: true,
			Nickname: true,
			ConnectionInfo: {
				Enabled: true,
				Message: '',
				Host: null
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
			Type: 0,
		}
	},
	Player: {
		mpvVideoOutput: '',
		Background: '',
		FullScreen: false,
		Monitor: false,
		NoBar: true,
		NoHud: true,
		Screen: 0,
		StayOnTop: true,
		PIP: {
			Enabled: true,
			PositionX: 'Right',
			PositionY: 'Bottom',
			Size: 30,
		},
		VisualizationEffects: true
	},
	Playlist: {
		AllowDuplicates: false,
		AllowDuplicateSeries: true,
		MaxDejaVuTime: 60,
		RemovePublicOnPlay: false,
		MysterySongs: {
			Hide: false,
			AddedSongVisibilityAdmin: true,
			AddedSongVisibilityPublic: true,
			Labels: [
				'???',
			]
		}
	},
	System: {
		JinglesAutoUpdate: true,
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
				Windows: 'app/bin/postgres/bin/',
				OSX: 'app/bin/postgres/bin/',
				Linux: 'app/bin/postgres/bin/',
			}
		},
		Path: {
			Avatars: 'app/avatars',
			Backgrounds: ['app/backgrounds'],
			Bin: 'app/bin',
			Import: 'app/import',
			Jingles: ['app/jingles'],
			Karas: ['app/data/karaokes'],
			Lyrics: ['app/data/lyrics'],
			Medias: ['app/data/medias'],
			MediasHTTP: '',
			Previews: 'app/previews',
			Series: ['app/data/series'],
			Tags: ['app/data/tags'],
			Temp: 'app/temp',
			DB: 'app/db'
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
	'Frontend.Permissions.AllowNicknameChange': {inclusion : bools},
	'Frontend.Permissions.AllowViewBlacklist': {inclusion : bools},
	'Frontend.Permissions.AllowViewBlacklistCriterias': {inclusion : bools},
	'Frontend.Permissions.AllowViewWhitelist': {inclusion : bools},
	'Frontend.AuthExpireTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Frontend.Mode': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2}},
	'Frontend.SeriesLanguageMode': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 3}},
	'Karaoke.Autoplay': {inclusion : bools},
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
	'Playlist.MysterySongs.Hide': {inclusion: bools},
	'Playlist.MysterySongs.AddedSongVisibilityAdmin': {inclusion: bools},
	'Playlist.MysterySongs.AddedSongVisibilityPublic': {inclusion: bools},
	'Playlist.MysterySongs.Labels': {arrayOneItemValidator: true}
};

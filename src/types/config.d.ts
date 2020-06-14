import { Repository } from '../lib/types/repo';

export interface Config {
	App: {
		JwtSecret?: string,
		InstanceID?: string,
		FirstRun?: boolean,
		QuickStart?: boolean
	},
	Online: {
		Host?: string,
		Port?: number,
		Users?: boolean,
		URL?: boolean,
		Stats?: boolean,
		ErrorTracking?: boolean,
		Discord?: {
			DisplayActivity?: boolean
		}
		Updates?: {
			Medias?: {
				Jingles?: boolean,
				Intros?: boolean,
				Outros?: boolean,
				Encores?: boolean,
				Sponsors?: boolean
			}
			App?: boolean
		}
		MediasHost: string
	},
	Frontend: {
		Port?: number,
		Mode?: number,
		SeriesLanguageMode: number,
		AuthExpireTime?: number,
		Permissions?: {
			AllowNicknameChange?: boolean,
			AllowViewWhitelist?: boolean,
			AllowViewBlacklist?: boolean,
			AllowViewBlacklistCriterias?: boolean
		},
		ShowAvatarsOnPlaylist?: boolean
	},
	Gitlab: {
		Enabled?: boolean,
		Host?: string,
		Token?: string,
		ProjectID?: number,
		IssueTemplate?: {
			Suggestion?: {
				Description?: string,
				Title?: string,
				Labels?: string[]
			}
		}
	},
	GUI: {
		OpenInElectron?: boolean,
	}
	Karaoke: {
		Private?: boolean,
		ClassicMode?: boolean,
		StreamerMode: {
			Enabled?: boolean,
			PauseDuration?: number
			Twitch: {
				Enabled?: boolean,
				OAuth?: string,
				Channel?: string
			}
		}
		Autoplay?: boolean,
		Repeat?: boolean,
		SmartInsert?: boolean,
		JinglesInterval?: number, // Obsolete since 3.1.1
		SponsorsInterval?: number, // Obsolete since 3.1.1
		Display: {
			Avatar?: boolean,
			Nickname?: boolean,
			ConnectionInfo?: {
				Enabled?: boolean,
				Host?: string,
				Message?: string
			}
		},
		Poll: {
			Enabled?: boolean,
			Choices?: number,
			Timeout?: number
		},
		Quota: {
			Songs?: number,
			Time?: number,
			Type?: number,
			FreeAutoTime?: number,
			FreeUpVotes?: boolean,
			FreeUpVotesRequiredPercent?: number,
			FreeUpVotesRequiredMin?: number
		}
	},
	Player: {
		StayOnTop?: boolean,
		FullScreen?: boolean,
		Background?: string,
		Screen?: number,
		VisualizationEffects?: boolean,
		Monitor?: boolean,
		NoHud?: boolean,
		NoBar?: boolean,
		mpvVideoOutput?: string,
		PIP: {
			Enabled?: boolean,
			Size?: number,
			PositionX?: PositionX,
			PositionY?: PositionY
		},
		ProgressBarDock?: boolean
	},
	Playlist: {
		AllowDuplicates?: boolean,
		AllowDuplicateSeries?: boolean,
		MaxDejaVuTime?: number,
		RemovePublicOnPlay?: boolean,
		Medias: {
			Jingles: {
				Enabled: boolean,
				Interval: number,
			},
			Sponsors: {
				Enabled: boolean,
				Interval: number,
			}
			Intros: {
				Enabled: boolean,
				File: string,
				Message?: string
			}
			Outros: {
				Enabled: boolean,
				File: string,
				Message?: string
			},
			Encores: {
				Enabled: boolean,
				File: string,
				Message?: string
			}
		}
		MysterySongs: {
			Hide?: boolean,
			AddedSongVisibilityPublic?: boolean,
			AddedSongVisibilityAdmin?: boolean,
			Labels?: string[]
		},
		RandomSongsAfterEnd: boolean,
		RandomSongsAfterEndMessage: boolean
	},
	System: {
		Binaries: {
			Player: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			},
			Postgres: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			},
			ffmpeg: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			}
		},
		Repositories: Repository[]
		Path: {
			Bin?: string,
			Karas?: string[],
			Medias?: string[],
			Lyrics?: string[],
			DB?: string,
			Series?: string[],
			Backgrounds?: string[],
			Jingles?: string[],
			Intros?: string[],
			Outros?: string[],
			Encores?: string[],
			Sponsors?: string[],
			Temp?: string,
			Previews?: string,
			Import?: string,
			Avatars?: string,
			Tags?: string[]
		}
	},
	Database: {
		'sql-file'?: boolean,
		defaultEnv?: string,
		prod: {
			driver?: any,
			host?: string,
			port?: number,
			user?: string,
			password?: string,
			superuser?: string,
			superuserPassword?: string,
			schema?: string,
			database?: string,
			bundledPostgresBinary?: boolean
			username?: string
		}
	}
}

export type PositionX = 'Left' | 'Right' | 'Center';
export type PositionY = 'Top' | 'Bottom' | 'Center';

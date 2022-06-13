import { PathType } from '../lib/types/config';
import { RepositoryMaintainerSettings, RepositoryUserSettings } from '../lib/types/repo';
import { MediaType } from './medias';
import { MpvHardwareDecodingOptions } from './mpvIPC';

export type Repository = RepositoryUserSettings | RepositoryMaintainerSettings;

export interface Config {
	App: {
		JwtSecret?: string;
		InstanceID?: string;
		FirstRun?: boolean;
		Language?: string;
	};
	Online: {
		Host?: string;
		Port?: number;
		Users?: boolean;
		Stats?: boolean;
		ErrorTracking?: boolean;
		Discord?: {
			DisplayActivity?: boolean;
		};
		Updates?: {
			Medias?: {
				Jingles?: boolean;
				Intros?: boolean;
				Outros?: boolean;
				Encores?: boolean;
				Sponsors?: boolean;
			};
			App?: boolean;
		};
		MediasHost?: string;
		Remote?: boolean;
		FetchPopularSongs?: boolean;
		AllowDownloads?: boolean;
	};
	Frontend: {
		AllowGuestLogin?: boolean;
		AllowCustomTemporaryGuests?: boolean;
		Mode?: number;
		ShowAvatarsOnPlaylist?: boolean;
	};
	GUI: {
		ChibiPlayer?: {
			Enabled?: boolean;
			AlwaysOnTop?: boolean;
			PositionX?: number;
			PositionY?: number;
		};
		ChibiPlaylist?: {
			Enabled?: boolean;
			PositionX?: number;
			PositionY?: number;
			Width?: number;
			Height?: number;
		};
	};
	Karaoke: {
		Collections?: Record<string, boolean>;
		ClassicMode?: boolean;
		StreamerMode: {
			Enabled?: boolean;
			PauseDuration?: number;
			Twitch: {
				Enabled?: boolean;
				OAuth?: string;
				Channel?: string;
			};
		};
		MinutesBeforeEndOfSessionWarning?: number;
		Autoplay?: boolean;
		AutoBalance?: boolean;
		Poll: {
			Enabled?: boolean;
			Choices?: number;
			Timeout?: number;
		};
		Quota: {
			Songs?: number;
			Time?: number;
			Type?: number;
			FreeAutoTime?: number;
			FreeUpVotes?: boolean;
			FreeUpVotesRequiredPercent?: number;
			FreeUpVotesRequiredMin?: number;
		};
	};
	Player: {
		Display: {
			Avatar?: boolean;
			Nickname?: boolean;
			ConnectionInfo?: {
				Enabled?: boolean;
				Host?: string;
				Message?: string;
			};
			RandomQuotes?: boolean;
			SongInfo?: boolean;
			SongInfoLanguage?: string;
		};
		StayOnTop?: boolean;
		FullScreen?: boolean;
		Screen?: number;
		AudioDevice?: string;
		Monitor?: boolean;
		mpvVideoOutput?: string;
		PIP: {
			Size?: number;
			PositionX?: 'Left' | 'Right' | 'Center';
			PositionY?: 'Top' | 'Bottom' | 'Center';
		};
		ProgressBarDock?: boolean;
		ExtraCommandLine?: string;
		Borders?: boolean;
		HardwareDecoding?: MpvHardwareDecodingOptions;
		KeyboardMediaShortcuts?: boolean;
		Volume?: number;
		LiveComments?: boolean;
	};
	Playlist: {
		AllowDuplicates?: boolean;
		MaxDejaVuTime?: number;
		Medias: {
			Jingles: {
				Enabled: boolean;
				Interval: number;
			};
			Sponsors: {
				Enabled: boolean;
				Interval: number;
			};
			Intros: {
				Enabled: boolean;
				Message?: string;
			};
			Outros: {
				Enabled: boolean;
				Message?: string;
			};
			Encores: {
				Enabled: boolean;
				Message?: string;
			};
		};
		MysterySongs: {
			Hide?: boolean;
			AddedSongVisibilityPublic?: boolean;
			AddedSongVisibilityAdmin?: boolean;
			Labels?: string[];
		};
		EndOfPlaylistAction: 'random' | 'repeat' | 'none';
		RandomSongsAfterEndMessage: boolean;
	};
	System: {
		FrontendPort: number;
		Database: {
			host?: string;
			port?: number;
			username?: string;
			password?: string;
			superuser?: string;
			superuserPassword?: string;
			database?: string;
			bundledPostgresBinary?: boolean;
		};
		Binaries: {
			Player: {
				Windows?: string;
				OSX?: string;
				Linux?: string;
			};
			Postgres: {
				Windows?: string;
				OSX?: string;
				Linux?: string;
			};
			ffmpeg: {
				Windows?: string;
				OSX?: string;
				Linux?: string;
			};
			patch: {
				Windows?: string;
				OSX?: string;
				Linux?: string;
			};
		};
		Repositories: Repository[];
		MediaPath: {
			[m in MediaType]: string[];
		};
		Path: {
			[p in PathType]?: string;
		};
	};
}

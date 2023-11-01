import { PathType } from '../lib/types/config.js';
import { PlaylistMediaType } from '../lib/types/playlistMedias.js';
import { Repository } from '../lib/types/repo.js';
import { endOfPlaylistActions } from '../utils/defaultSettings.js';
import { MpvHardwareDecodingOptions } from './mpvIPC.js';
import { SongModifiers } from './player.js';

export interface QuizGameConfig {
	EndGame: {
		MaxScore: {
			Enabled: boolean;
			Score: number;
		};
		MaxSongs: {
			Enabled: boolean;
			Songs: number;
		};
		Duration: {
			Enabled: boolean;
			Minutes: number;
		};
	};
	Players: {
		Twitch: boolean;
		TwitchPlayerName?: string;
		Guests: boolean;
	};
	TimeSettings: {
		WhenToStartSong: number;
		GuessingTime: number;
		QuickGuessingTime: number;
		AnswerTime: number;
	};
	Answers: {
		Accepted: {
			[QuizAnswers: string]: {
				Enabled: boolean;
				Points: number;
			};
		};
		QuickAnswer: {
			Enabled: boolean;
			Points: number;
		};
		SimilarityPercentageNeeded: number;
	};
	Modifiers: SongModifiers;
	PlayerMessage: string;
}

export type EndOfPlaylistAction = (typeof endOfPlaylistActions)[number];

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
		WelcomeMessage?: string;
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
				QRCode?: boolean;
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
		ExtraCommandLine?: string;
		Borders?: boolean;
		HardwareDecoding?: MpvHardwareDecodingOptions;
		KeyboardMediaShortcuts?: boolean;
		Volume?: number;
		LiveComments?: boolean;
		BlurVideoOnWarningTag?: boolean;
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
		EndOfPlaylistAction: EndOfPlaylistAction;
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
			[m in PlaylistMediaType]: string[];
		};
		Path: {
			[p in PathType]?: string;
		};
	};
	Maintainer: {
		ApplyLyricsCleanupOnKaraSave: boolean; // Temporary setting until there's an unified way of defining base rules (media formats, lyrics cleanup)
	};
}

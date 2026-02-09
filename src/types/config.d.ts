import { KaraLineDisplayElement, KaraSortElement, PathType } from '../lib/types/config.js';
import { PositionX, PositionY } from '../lib/types/index.js';
import { PlaylistMediaType } from '../lib/types/playlistMedias.js';
import { Collections, Repository } from '../lib/types/repo.js';
import { endOfPlaylistActions } from '../utils/defaultSettings.js';
import { MpvHardwareDecodingOptions } from './mpvIPC.js';
import { SongModifiers } from './player.js';

export type PublicDuplicateSetting = 'allowed' | 'upvotes' | 'disallowed';

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

export interface DBConfig {
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	superuser?: string;
	superuserPassword?: string;
	database?: string;
	bundledPostgresBinary?: boolean;
	socket?: string;
	connection?: 'tcp' | 'socket';
	RestoreNeeded?: boolean;
}

export interface Config {
	App: {
		JwtSecret?: string;
		InstanceID?: string;
		FirstRun?: boolean;
		Language?: string;
	};
	Online: {
		Host?: string; // Remove in KM 10
		Secure?: boolean; // Remove in KM 10
		Timeout?: number;
		Users?: boolean; // Remove in KM 10
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
		Remote?: boolean; // Remote is not used anymore (remove in KM 10.0)
		RemoteAccess?: {
			Enabled?: boolean;
			Domain?: string;
			Secure?: boolean;
			Token?: string;
		};
		RemoteUsers?: {
			Enabled?: boolean;
			DefaultHost?: string;
			Secure?: boolean;
		};
		RemoteToken?: string; // Remove in KM 10
		FetchPopularSongs?: boolean;
		AllowDownloads?: boolean;
	};
	Frontend: {
		AllowGuestLogin?: boolean;
		AllowCustomTemporaryGuests?: boolean;
		AllowUserCreation?: boolean;
		RequireSecurityCodeForNewAccounts?: boolean;
		Mode?: number;
		PublicPlayerControls?: boolean;
		ShowAvatarsOnPlaylist?: boolean;
		WelcomeMessage?: string;
		Library?: {
			KaraLineDisplay?: KaraLineDisplayElement[];
			KaraLineSort?: KaraSortElement[];
		};
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
		ChibiRanking?: {
			Enabled?: boolean;
			PositionX?: number;
			PositionY?: number;
			Width?: number;
			Height?: number;
		};
	};
	Karaoke: {
		Collections?: Collections;
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
			FreeAcceptedSongs?: boolean;
		};
		RestrictInterfaceAtTime?: Date;
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
				QRCodeDuringSong?: boolean;
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
			PositionX?: PositionX;
			PositionY?: PositionY;
		};
		ExtraCommandLine?: string;
		Borders?: boolean;
		HardwareDecoding?: MpvHardwareDecodingOptions;
		KeyboardMediaShortcuts?: boolean;
		Volume?: number;
		AudioDelay?: number;
		LiveComments?: boolean;
		BlurVideoOnWarningTag?: boolean;
		AudioOnlyExperience?: boolean;
	};
	Playlist: {
		AllowDuplicates?: boolean;
		AllowPublicCurrentPlaylistItemSwap?: boolean;
		AllowPublicDuplicates?: PublicDuplicateSetting;
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
		CurrentPlaylistAutoRemoveSongs: number;
	};
	System: {
		SystemRepositoryMaintainance?: boolean;
		FrontendPort: number;
		Database: DBConfig;
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
}

import { QueryResult } from 'pg';
import { LogResult, StatusResult } from 'simple-git';
import { Systeminformation } from 'systeminformation';

import { ASSLine } from '../../../src/lib/types/ass.js';
import { DBKara } from '../../../src/lib/types/database/kara.js';
import { DBPLC, DBPLCBase } from '../../../src/lib/types/database/playlist.js';
import { DBTag } from '../../../src/lib/types/database/tag.js';
import { DBUser } from '../../../src/lib/types/database/user.js';
import { APIMessageType } from '../../../src/lib/types/frontend.js';
import { HookResult } from '../../../src/lib/types/hook.js';
import { Inbox } from '../../../src/lib/types/inbox.js';
import { RecursivePartial } from '../../../src/lib/types/index.js';
import {
	EditedKara,
	KaraList,
	MediaInfo,
	MediaInfoValidationResult,
	OrderParam as KaraOrderParam,
	YearList,
} from '../../../src/lib/types/kara.js';
import { LogLine } from '../../../src/lib/types/logger.js';
import { Criteria, PlaylistExport, PLCEditParams, PLCSearchParams } from '../../../src/lib/types/playlist.js';
import { RemoteFailure, RemoteSuccess } from '../../../src/lib/types/remote.js';
import { Repository, RepositoryBasic, RepositoryManifestV2 } from '../../../src/lib/types/repo.js';
import { Tag, TagParams } from '../../../src/lib/types/tag.js';
import { OldJWTToken, OldTokenResponse, Role, User } from '../../../src/lib/types/user.js';
import { HttpMessage, WSCmdDefinition } from '../../../src/lib/types/frontend.js';
import { BackgroundList, BackgroundListRequest, BackgroundRequest } from '../../../src/types/backgrounds.js';
import { Config, QuizGameConfig } from '../../../src/types/config.js';
import { DBStats } from '../../../src/types/database/database.js';
import { DBDownload } from '../../../src/types/database/download.js';
import { MigrationsFrontend } from '../../../src/types/database/migrationsFrontend.js';
import { DBPL, DBPLCInfo } from '../../../src/types/database/playlist.js';
import { KaraDownloadRequest, QueueStatus } from '../../../src/types/download.js';
import { AutoMixParams, AutoMixPlaylistInfo, FavExport, FavoritesMicro } from '../../../src/types/favorites.js';
import { Feed } from '../../../src/types/feeds.js';
import { PlayerCommand } from '../../../src/types/player.js';
import { ShuffleMethods } from '../../../src/types/playlist.js';
import { PollItem, PollObject } from '../../../src/types/poll.js';
import {
	Game,
	GameAnswerResult,
	GamePossibleAnswer,
	GameScore,
	GameState,
	GameTotalScore,
} from '../../../src/types/quiz.js';
import { Commit, DifferentChecksumReport, ImportBaseFile, ModifiedMedia, Push } from '../../../src/types/repo.js';
import { Session, SessionExports } from '../../../src/types/session.js';
import { PublicPlayerState, PublicState, State, Version } from '../../../src/types/state.js';
import { SingleToken, Tokens } from '../../../src/types/user.js';

export function defineWSCmd<Body extends object, Response>(value: string): WSCmdDefinition<Body, Response> {
	return { value, bodyType: {} as Body, responseType: {} as Response };
}

export const WS_CMD = {
	// AREA src\controllers\frontend\backgrounds.ts
	GET_BACKGROUND_FILES: defineWSCmd<BackgroundListRequest, BackgroundList>('getBackgroundFiles'),
	ADD_BACKGROUND: defineWSCmd<BackgroundRequest<Express.Multer.File>, void>('addBackground'),
	REMOVE_BACKGROUND: defineWSCmd<BackgroundRequest<string>, void>('removeBackground'),
	// AREA src\controllers\frontend\download.ts
	ADD_DOWNLOADS: defineWSCmd<{ downloads: KaraDownloadRequest[] }, APIMessageType<number>>('addDownloads'),
	GET_DOWNLOADS: defineWSCmd<undefined, DBDownload[]>('getDownloads'),
	GET_DOWNLOAD_QUEUE_STATUS: defineWSCmd<undefined, QueueStatus>('getDownloadQueueStatus'),
	DELETE_DOWNLOADS: defineWSCmd<undefined, QueryResult<any>>('deleteDownloads'),
	PAUSE_DOWNLOADS: defineWSCmd<undefined, any>('pauseDownloads'),
	START_DOWNLOAD_QUEUE: defineWSCmd<undefined, APIMessageType<unknown>>('startDownloadQueue'),
	UPDATE_ALL_MEDIAS: defineWSCmd<{ repoNames: string[]; dryRun?: boolean }, APIMessageType<unknown>>(
		'updateAllMedias'
	),
	// AREA src\controllers\frontend\favorites.ts
	GET_FAVORITES_MICRO: defineWSCmd<{ from?: number; size?: number }, FavoritesMicro[]>('getFavoritesMicro'),
	GET_FAVORITES: defineWSCmd<{ filter: string; from?: number; size?: number; order?: KaraOrderParam }, KaraList>(
		'getFavorites'
	), // TODO given in route file
	ADD_FAVORITES: defineWSCmd<{ kids: string[] }, void>('addFavorites'),
	DELETE_FAVORITES: defineWSCmd<{ kids: string[] }, void>('deleteFavorites'),
	EXPORT_FAVORITES: defineWSCmd<undefined, FavExport>('exportFavorites'),
	IMPORT_FAVORITES: defineWSCmd<{ favorites: FavExport }, HttpMessage>('importFavorites'),
	// AREA src\controllers\frontend\files.ts
	IMPORT_FILE: defineWSCmd<{ extension: string; buffer: any }, { filename?: string; code?: number }>('importFile'),
	OPEN_LYRICS_FILE: defineWSCmd<{ kid: string }, void>('openLyricsFile'),
	SHOW_LYRICS_IN_FOLDER: defineWSCmd<{ kid: string }, void>('showLyricsInFolder'),
	SHOW_MEDIA_IN_FOLDER: defineWSCmd<{ kid: string }, void>('showMediaInFolder'),
	// AREA src\controllers\frontend\importBase.ts
	FIND_FILES_TO_IMPORT: defineWSCmd<{ dirname: string; template: string }, ImportBaseFile[]>('findFilesToImport'),
	IMPORT_BASE: defineWSCmd<{ source: string; template: string; repoDest: string }, void>('importBase'),
	// AREA src\controllers\frontend\inbox.ts
	GET_INBOX: defineWSCmd<{ repoName: string }, Inbox[]>('getInbox'),
	DOWNLOAD_KARA_FROM_INBOX: defineWSCmd<{ repoName: string; inid: string }, void>('downloadKaraFromInbox'),
	DELETE_KARA_FROM_INBOX: defineWSCmd<{ repoName: string; inid: string }, void>('deleteKaraFromInbox'),
	// AREA src\controllers\frontend\kara.ts
	GET_KARAS: defineWSCmd<
		{
			filter?: string;
			from?: number;
			size?: number;
			order?: KaraOrderParam | '';
			direction?: 'desc' | 'asc';
			q?: string;
			random?: number;
			blacklist?: boolean;
			parentsOnly?: boolean;
			ignoreCollections?: boolean;
		},
		KaraList
	>('getKaras'),
	CREATE_KARA: defineWSCmd<EditedKara, HttpMessage<string>>('createKara'),
	GET_KARA_MEDIA_INFO: defineWSCmd<{ kid: string }, MediaInfo>('getKaraMediaInfo'),
	VALIDATE_MEDIA_INFO: defineWSCmd<{ mediaInfo: MediaInfo; repository: string }, MediaInfoValidationResult[]>(
		'validateMediaInfo'
	),
	PROCESS_UPLOADED_MEDIA: defineWSCmd<{ filename: string; origFilename: string }, MediaInfo>('processUploadedMedia'),
	EMBED_AUDIO_FILE_COVER_ART: defineWSCmd<
		{ kid: string; tempFilename: string; coverPictureFilename: string },
		MediaInfo
	>('embedAudioFileCoverArt'),
	ENCODE_MEDIA_FILE_TO_REPO_DEFAULTS: defineWSCmd<
		{ kid?: string; filename?: string; repo?: string; encodeOptions?: { trim?: boolean } },
		MediaInfo
	>('encodeMediaFileToRepoDefaults'),
	ABORT_MEDIA_ENCODING: defineWSCmd<undefined, void>('abortMediaEncoding'),
	PREVIEW_HOOKS: defineWSCmd<EditedKara, HookResult>('previewHooks'),
	GET_KARA: defineWSCmd<{ kid: string }, DBKara>('getKara'),
	DELETE_KARAS: defineWSCmd<{ kids: string[] }, HttpMessage<string>>('deleteKaras'),
	ADD_KARA_TO_PUBLIC_PLAYLIST: defineWSCmd<{ kids: string[] }, { plc: DBPLCInfo }>('addKaraToPublicPlaylist'),
	EDIT_KARA: defineWSCmd<EditedKara, HttpMessage<string>>('editKara'),
	GET_KARA_LYRICS: defineWSCmd<{ kid: string }, ASSLine[]>('getKaraLyrics'),
	COPY_KARA_TO_REPO: defineWSCmd<{ kid: string; repo: string }, HttpMessage<string>>('copyKaraToRepo'),
	PLAY_KARA: defineWSCmd<{ kid: string }, void>('playKara'),
	EDIT_KARAS: defineWSCmd<
		{ plaid: string; action: 'add' | 'remove' | 'fromDisplayType'; tid: string; type: number },
		void
	>('editKaras'),
	DELETE_MEDIA_FILES: defineWSCmd<{ files: string[]; repo: string }, void>('deleteMediaFiles'),
	GET_STATS: defineWSCmd<{ repoNames: string[] }, DBStats>('getStats'),
	// AREA src\controllers\frontend\misc.ts
	OPEN_LOG_FILE: defineWSCmd<undefined, void>('openLogFile'),
	GET_MIGRATIONS_FRONTEND: defineWSCmd<undefined, MigrationsFrontend[]>('getMigrationsFrontend'),
	SET_MIGRATIONS_FRONTEND: defineWSCmd<{ mig: MigrationsFrontend }, void>('setMigrationsFrontend'),
	GET_REMOTE_DATA: defineWSCmd<undefined, { active: boolean; info?: RemoteSuccess | RemoteFailure; token?: string }>(
		'getRemoteData'
	),
	RESET_REMOTE_TOKEN: defineWSCmd<undefined, void>('resetRemoteToken'),
	SHUTDOWN: defineWSCmd<undefined, void>('shutdown'),
	GET_SETTINGS: defineWSCmd<undefined, { version: Version; config: Config; state: PublicState }>('getSettings'),
	GET_ELECTRON_VERSIONS: defineWSCmd<undefined, NodeJS.ProcessVersions>('getElectronVersions'),
	UPDATE_SETTINGS: defineWSCmd<{ setting: RecursivePartial<Config> }, Config>('updateSettings'),
	GET_DISPLAYS: defineWSCmd<undefined, Systeminformation.GraphicsDisplayData[]>('getDisplays'),
	GET_AUDIO_DEVICES: defineWSCmd<undefined, string[][]>('getAudioDevices'),
	REFRESH_USER_QUOTAS: defineWSCmd<undefined, void>('refreshUserQuotas'),
	GET_PLAYER_STATUS: defineWSCmd<undefined, PublicPlayerState>('getPlayerStatus'),
	GET_NEWS_FEED: defineWSCmd<undefined, Feed[]>('getNewsFeed'),
	GET_CATCHPHRASE: defineWSCmd<undefined, string>('getCatchphrase'),
	GET_LOGS: defineWSCmd<{ level: string }, LogLine[]>('getLogs'),
	BACKUP_SETTINGS: defineWSCmd<undefined, HttpMessage<string>>('backupSettings'),
	GENERATE_DATABASE: defineWSCmd<undefined, HttpMessage<string>>('generateDatabase'),
	VALIDATE_FILES: defineWSCmd<undefined, HttpMessage<string>>('validateFiles'),
	DUMP_DATABASE: defineWSCmd<undefined, HttpMessage<string>>('dumpDatabase'),
	RESTORE_DATABASE: defineWSCmd<undefined, APIMessageType<string>>('restoreDatabase'),
	GET_FS: defineWSCmd<
		{ path: string; onlyMedias?: boolean },
		{
			contents: { name: string; isDirectory: boolean }[];
			drives: Systeminformation.BlockDevicesData[];
			fullPath: string;
		}
	>('getFS'),
	// AREA src\controllers\frontend\player.ts
	PLAY: defineWSCmd<undefined, void>('play'),
	DISPLAY_PLAYER_MESSAGE: defineWSCmd<
		{ message: string; duration: number; destination: 'all' | 'screen' | 'users' },
		HttpMessage<string>
	>('displayPlayerMessage'),
	SEND_PLAYER_COMMAND: defineWSCmd<{ command: PlayerCommand; options?: any }, HttpMessage<string>>(
		'sendPlayerCommand'
	),
	START_PLAYER: defineWSCmd<undefined, void>('startPlayer'),
	// AREA src\controllers\frontend\playlists.ts
	CREATE_AUTOMIX: defineWSCmd<AutoMixParams, AutoMixPlaylistInfo>('createAutomix'),
	GET_PLAYLISTS: defineWSCmd<undefined, DBPL[]>('getPlaylists'),
	CREATE_PLAYLIST: defineWSCmd<DBPL, { plaid: string }>('createPlaylist'),
	GET_PLAYLIST: defineWSCmd<{ plaid: string }, DBPL>('getPlaylist'),
	EDIT_PLAYLIST: defineWSCmd<Partial<DBPL> & { name?: string; plaid: string }, void>('editPlaylist'),
	DELETE_PLAYLIST: defineWSCmd<{ plaid: string }, void>('deletePlaylist'),
	EMPTY_PLAYLIST: defineWSCmd<{ plaid: string }, string>('emptyPlaylist'),
	EXPORT_PLAYLIST_MEDIA: defineWSCmd<
		{ plaid: string; exportDir: string },
		Array<DBPLC & { exportSuccessful: boolean }>
	>('exportPlaylistMedia'),
	FIND_PLAYING_SONG_IN_PLAYLIST: defineWSCmd<{ plaid: string }, { index: number }>('findPlayingSongInPlaylist'),
	GET_PLAYLIST_CONTENTS: defineWSCmd<PLCSearchParams & { plaid: string }, KaraList>('getPlaylistContents'),
	GET_PLAYLIST_CONTENTS_MICRO: defineWSCmd<{ plaid: string; username?: string }, DBPLCBase[]>(
		'getPlaylistContentsMicro'
	),
	ADD_KARA_TO_PLAYLIST: defineWSCmd<{ kids: string[]; plaid?: string; pos?: number }, { plc: DBPLCInfo }>(
		'addKaraToPlaylist'
	),
	COPY_KARA_TO_PLAYLIST: defineWSCmd<{ plc_ids: number[]; plaid: string; pos: number }, void>('copyKaraToPlaylist'),
	DELETE_KARA_FROM_PLAYLIST: defineWSCmd<{ plc_ids: number[] }, void>('deleteKaraFromPlaylist'),
	GET_PLC: defineWSCmd<{ plc_id: number }, DBPLCInfo>('getPLC'),
	SWAP_PLCS: defineWSCmd<{ plcid1: number; plcid2: number }, void>('swapPLCs'),
	EDIT_PLC: defineWSCmd<PLCEditParams & { plc_ids: number[] }, { plaids: ArrayIterator<DBPL> }>('editPLC'),
	RANDOMIZE_PLC: defineWSCmd<{ plc_ids: number[] }, void>('randomizePLC'),
	VOTE_PLC: defineWSCmd<{ plc_id: number; downvote?: boolean }, void>('votePLC'),
	EXPORT_PLAYLIST: defineWSCmd<{ plaid: string }, PlaylistExport>('exportPlaylist'),
	IMPORT_PLAYLIST: defineWSCmd<{ playlist: PlaylistExport }, HttpMessage<{ plaid: string; unknownRepos: string[] }>>(
		'importPlaylist'
	),
	SHUFFLE_PLAYLIST: defineWSCmd<{ plaid: string; method: ShuffleMethods; fullShuffle: boolean }, void>(
		'shufflePlaylist'
	),
	// AREA src\controllers\frontend\poll.ts
	GET_POLL: defineWSCmd<undefined, PollObject>('getPoll'),
	VOTE_POLL: defineWSCmd<{ index: number }, HttpMessage<PollItem[]>>('votePoll'),
	// AREA src\controllers\frontend\quiz.ts
	START_GAME: defineWSCmd<{ gamename: string; playlist: string; settings?: QuizGameConfig }, void>('startGame'),
	STOP_GAME: defineWSCmd<undefined, void>('stopGame'),
	DELETE_GAME: defineWSCmd<{ gamename: string }, void>('deleteGame'),
	RESET_GAME_SCORES: defineWSCmd<{ gamename: string }, void>('resetGameScores'),
	CONTINUE_GAME_SONG: defineWSCmd<undefined, boolean>('continueGameSong'),
	GET_GAMES: defineWSCmd<undefined, Game[]>('getGames'),
	GET_GAME_SCORE: defineWSCmd<{ gamename: string; login?: string }, GameScore[]>('getGameScore'),
	GET_TOTAL_GAME_SCORE: defineWSCmd<{ gamename: string }, GameTotalScore[]>('getTotalGameScore'),
	GET_POSSIBLE_ANSWERS: defineWSCmd<{ answer: string }, GamePossibleAnswer[]>('getPossibleAnswers'),
	SET_ANSWER: defineWSCmd<{ answer: string }, GameAnswerResult>('setAnswer'),
	GET_GAME_STATE: defineWSCmd<undefined, GameState>('getGameState'),
	GET_LAST_KARAS: defineWSCmd<undefined, KaraList>('getLastKaras'),
	// AREA src\controllers\frontend\repo.ts
	GET_SSHPUB_KEY: defineWSCmd<{ repoName: string }, string>('getSSHPubKey'),
	GENERATE_SSHKEY: defineWSCmd<{ repoName: string }, void>('generateSSHKey'),
	REMOVE_SSHKEY: defineWSCmd<{ repoName: string }, void>('removeSSHKey'),
	CONVERT_REPO_TO_UUID: defineWSCmd<{ repoName: string }, void>('convertRepoToUUID'),
	GET_REPOS: defineWSCmd<undefined, Repository[]>('getRepos'),
	ADD_REPO: defineWSCmd<Repository, HttpMessage<string>>('addRepo'),
	GET_REPO: defineWSCmd<{ name: string }, Repository>('getRepo'),
	GET_REPO_MANIFEST: defineWSCmd<{ name: string }, RepositoryManifestV2>('getRepoManifest'),
	DELETE_REPO: defineWSCmd<{ name: string }, HttpMessage<string>>('deleteRepo'),
	EDIT_REPO: defineWSCmd<{ name: string; newRepo: Repository }, HttpMessage<string>>('editRepo'),
	GET_UNUSED_TAGS: defineWSCmd<{ name: string }, DBTag[]>('getUnusedTags'),
	GET_UNUSED_MEDIAS: defineWSCmd<{ name: string }, string[]>('getUnusedMedias'),
	MOVING_MEDIA_REPO: defineWSCmd<{ name: string; path: string }, HttpMessage<string>>('movingMediaRepo'),
	COMPARE_LYRICS_BETWEEN_REPOS: defineWSCmd<{ repo1: string; repo2: string }, DifferentChecksumReport[]>(
		'compareLyricsBetweenRepos'
	),
	SYNC_TAGS_BETWEEN_REPOS: defineWSCmd<{ repoSourceName: string; repoDestName: string }, void>(
		'syncTagsBetweenRepos'
	),
	COPY_LYRICS_BETWEEN_REPOS: defineWSCmd<{ report: DifferentChecksumReport[] }, HttpMessage<string>>(
		'copyLyricsBetweenRepos'
	),
	OPEN_MEDIA_FOLDER: defineWSCmd<{ name: string }, void>('openMediaFolder'),
	DELETE_ALL_REPO_MEDIAS: defineWSCmd<{ name: string }, HttpMessage<string>>('deleteAllRepoMedias'),
	DELETE_OLD_REPO_MEDIAS: defineWSCmd<{ name: string }, HttpMessage<string>>('deleteOldRepoMedias'),
	DELETE_MEDIAS: defineWSCmd<{ kids: string[] }, HttpMessage<string>>('deleteMedias'),
	GET_REPO_FREE_SPACE: defineWSCmd<{ repoName: string }, number>('getRepoFreeSpace'),
	UPDATE_ALL_REPOS: defineWSCmd<undefined, void>('updateAllRepos'),
	UPDATE_REPO: defineWSCmd<{ repoName: string }, void>('updateRepo'),
	STASH_REPO: defineWSCmd<{ repoName: string }, void>('stashRepo'),
	CHECK_REPO: defineWSCmd<{ repoName: string }, StatusResult>('checkRepo'),
	LIST_REPO_STASHES: defineWSCmd<{ repoName: string }, LogResult>('listRepoStashes'),
	GET_FILE_DIFF: defineWSCmd<{ repoName: string; file: string }, string>('getFileDiff'),
	POP_STASH: defineWSCmd<{ repoName: string; stashId: number }, boolean>('popStash'),
	DROP_STASH: defineWSCmd<{ repoName: string; stashId: number }, string>('dropStash'),
	RESET_REPO: defineWSCmd<{ repoName: string }, void>('resetRepo'),
	GET_COMMITS: defineWSCmd<{ repoName: string }, { commits: Commit[]; modifiedMedias: ModifiedMedia[] }>(
		'getCommits'
	),
	UPLOAD_MEDIA: defineWSCmd<{ kid: string }, void>('uploadMedia'),
	PUSH_COMMITS: defineWSCmd<{ repoName: string; commits: Push; ignoreFTP?: boolean }, void>('pushCommits'),
	// AREA src\controllers\frontend\session.ts
	GET_SESSIONS: defineWSCmd<undefined, Session[]>('getSessions'),
	CREATE_SESSION: defineWSCmd<Session, HttpMessage<string>>('createSession'),
	MERGE_SESSIONS: defineWSCmd<{ seid1: string; seid2: string }, HttpMessage<{ session: Session }>>('mergeSessions'),
	EDIT_SESSION: defineWSCmd<Session, HttpMessage<string>>('editSession'),
	ACTIVATE_SESSION: defineWSCmd<{ seid: string }, HttpMessage<string>>('activateSession'),
	DELETE_SESSION: defineWSCmd<{ seid: string }, HttpMessage<string>>('deleteSession'),
	EXPORT_SESSION: defineWSCmd<{ seid: string }, SessionExports>('exportSession'),
	// AREA src\controllers\frontend\smartPlaylist.ts
	CREATE_PROBLEMATIC_SMART_PLAYLIST: defineWSCmd<undefined, void>('createProblematicSmartPlaylist'),
	GET_CRITERIAS: defineWSCmd<{ plaid: string; langs: string[] }, Criteria[]>('getCriterias'),
	EMPTY_CRITERIAS: defineWSCmd<{ plaid: string }, void>('emptyCriterias'),
	REMOVE_CRITERIAS: defineWSCmd<{ criterias: Criteria[] }, void>('removeCriterias'),
	ADD_CRITERIAS: defineWSCmd<{ criterias: Criteria[] }, void>('addCriterias'),
	// AREA src\controllers\frontend\tag.ts
	GET_TAGS: defineWSCmd<TagParams, { infos: { count: number; from: number; to: number }; content: DBTag[] }>(
		'getTags'
	),
	ADD_TAG: defineWSCmd<Tag, HttpMessage<Tag>>('addTag'),
	GET_YEARS: defineWSCmd<undefined, YearList>('getYears'),
	MERGE_TAGS: defineWSCmd<{ tid1: string; tid2: string }, HttpMessage<Tag>>('mergeTags'),
	DELETE_TAG: defineWSCmd<{ tids: string[] }, HttpMessage<string>>('deleteTag'),
	GET_TAG: defineWSCmd<{ tid: string }, DBTag>('getTag'),
	EDIT_TAG: defineWSCmd<Tag & { tid: string }, HttpMessage<string>>('editTag'),
	COPY_TAG_TO_REPO: defineWSCmd<{ tid: string; repo: string }, HttpMessage<string>>('copyTagToRepo'),
	GET_COLLECTIONS: defineWSCmd<undefined, DBTag[]>('getCollections'),
	// AREA src\controllers\frontend\test.ts
	GET_STATE: defineWSCmd<undefined, State>('getState'),
	GET_FULL_CONFIG: defineWSCmd<undefined, Config>('getFullConfig'),
	// AREA src\controllers\frontend\user.ts
	GET_USERS: defineWSCmd<undefined, DBUser[]>('getUsers'),
	CREATE_USER: defineWSCmd<User & { role?: Role }, HttpMessage<string>>('createUser'),
	GET_USER: defineWSCmd<{ username: string }, DBUser>('getUser'),
	DELETE_USER: defineWSCmd<{ username: string }, HttpMessage<string>>('deleteUser'),
	EDIT_USER: defineWSCmd<User & { avatar?: Express.Multer.File }, HttpMessage<string>>('editUser'),
	RESET_USER_PASSWORD: defineWSCmd<{ username: string; securityCode: number; password: string }, HttpMessage<string>>(
		'resetUserPassword'
	),
	GET_MY_ACCOUNT: defineWSCmd<undefined, DBUser>('getMyAccount'),
	DELETE_MY_ACCOUNT: defineWSCmd<undefined, HttpMessage<string>>('deleteMyAccount'),
	EDIT_MY_ACCOUNT: defineWSCmd<User & { avatar?: Express.Multer.File }, HttpMessage<{ onlineToken: any }>>(
		'editMyAccount'
	),
	CONVERT_MY_LOCAL_USER_TO_ONLINE: defineWSCmd<{ password: string; instance: string }, HttpMessage<Tokens>>(
		'convertMyLocalUserToOnline'
	),
	CONVERT_MY_ONLINE_USER_TO_LOCAL: defineWSCmd<{ password: string }, HttpMessage<SingleToken>>(
		'convertMyOnlineUserToLocal'
	),
	REFRESH_ANIME_LIST: defineWSCmd<undefined, void>('refreshAnimeList'),
	GET_ANIME_LIST: defineWSCmd<
		{
			filter?: string;
			from?: number;
			size?: number;
			order?: KaraOrderParam;
			direction?: 'asc' | 'desc';
			q?: string;
			parentsOnly?: boolean;
			blacklist?: boolean;
		},
		KaraList
	>('getAnimeList'),
	// AREA src\controllers\auth.ts
	LOGIN: defineWSCmd<{ username: string; password: string; securityCode?: number }, OldTokenResponse>('login'),
	LOGIN_GUEST: defineWSCmd<{ name: string }, OldTokenResponse>('loginGuest'),
	CHECK_AUTH: defineWSCmd<undefined, OldJWTToken & { onlineAvailable: boolean }>('checkAuth'),
} as const;

// commandBackend\('([a-zA-Z0-9]+)'
// commandBackend(WS_CMD.$1

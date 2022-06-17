import { DBPL, DBPLCBase } from '../../../../src/lib/types/database/playlist';

// Action name
export enum FrontendContextAction {
	FILTER_VALUE = 'filterValue',
	BG_IMAGE = 'bgImage',
	PLAYLIST_INFO_LEFT = 'playlistInfoLeft',
	PLAYLIST_INFO_RIGHT = 'playlistInfoRight',
	INDEX_KARA_DETAIL = 'indexKaraDetail',
}

// Dispatch action
export interface FilterValue {
	type: FrontendContextAction.FILTER_VALUE;
	payload: {
		filterValue: string;
		side: 'left' | 'right';
		idPlaylist: string;
	};
}

export interface BackgroundImage {
	type: FrontendContextAction.BG_IMAGE;
	payload: {
		backgroundImg: string;
	};
}

export interface PlaylistInfo {
	type: FrontendContextAction.PLAYLIST_INFO_LEFT | FrontendContextAction.PLAYLIST_INFO_RIGHT;
	payload: {
		playlist: DBPL & {
			content: DBPLCBase[];
		};
	};
}

export interface IndexKaraDetail {
	type: FrontendContextAction.INDEX_KARA_DETAIL;
	payload: {
		indexKaraDetail: number;
	};
}

// store
export interface FrontendContextStore {
	loading: boolean;
	filterValue1: string;
	filterValue2: string;
	backgroundImg: string;
	indexKaraDetail: number;
	playlistInfoLeft: DBPL & {
		content: DBPLCBase[];
	};
	playlistInfoRight: DBPL & {
		content: DBPLCBase[];
	};
}

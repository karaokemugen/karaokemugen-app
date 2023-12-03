import { DBPLCBase } from '../../../../src/lib/types/database/playlist';
import { DBPL } from '../../../../src/types/database/playlist';

// Action name
export enum FrontendContextAction {
	FILTER_VALUE = 'filterValue',
	BG_IMAGE = 'bgImage',
	PLAYLIST_INFO_LEFT = 'playlistInfoLeft',
	PLAYLIST_INFO_RIGHT = 'playlistInfoRight',
	INDEX_KARA_DETAIL = 'indexKaraDetail',
	FUTURE_TIME = 'futurTime',
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

export interface FuturTime {
	type: FrontendContextAction.FUTURE_TIME;
	payload: {
		futurTime: string;
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
	futurTime: string;
}

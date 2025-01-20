import { Dispatch } from 'react';

import { DBPLCBase } from '../../../../src/lib/types/database/playlist';
import { DBPL } from '../../../../src/types/database/playlist';
import { commandBackend } from '../../utils/socket';
import { isNonStandardPlaylist, nonStandardPlaylists } from '../../utils/tools';
import {
	BackgroundImage,
	FilterValue,
	FrontendContextAction,
	FuturTime,
	IndexKaraDetail,
	PlaylistInfo,
} from '../types/frontendContext';

export function setFilterValue(
	dispatch: Dispatch<FilterValue>,
	filterValue: string,
	side: 'left' | 'right',
	idPlaylist: string
) {
	dispatch({
		type: FrontendContextAction.FILTER_VALUE,
		payload: { filterValue, side, idPlaylist },
	});
}

export function setBgImage(dispatch: Dispatch<BackgroundImage>, backgroundImg) {
	dispatch({
		type: FrontendContextAction.BG_IMAGE,
		payload: { backgroundImg },
	});
}

export async function setPlaylistInfoLeft(dispatch: Dispatch<PlaylistInfo>, plaid?: string) {
	if (!plaid) {
		const cookie = localStorage.getItem('mugenPlVal1');
		const playlistList: PlaylistElem[] = await commandBackend('getPlaylists');
		plaid =
			cookie !== null &&
			(isNonStandardPlaylist(cookie) || playlistList.find(playlist => playlist.plaid === cookie)) &&
			cookie !== localStorage.getItem('mugenPlVal2')
				? cookie
				: nonStandardPlaylists.library;
	}
	const playlist = await getPlaylistInfo(plaid);
	if (playlist) {
		localStorage.setItem('mugenPlVal1', playlist.plaid);
		dispatch({
			type: FrontendContextAction.PLAYLIST_INFO_LEFT,
			payload: { playlist },
		});
	}
}

export async function setPlaylistInfoRight(dispatch: Dispatch<PlaylistInfo>, plaid?: string) {
	if (!plaid) {
		const cookie = localStorage.getItem('mugenPlVal2');
		const playlistList: PlaylistElem[] = await commandBackend('getPlaylists');
		plaid =
			cookie !== null &&
			(isNonStandardPlaylist(cookie) || playlistList.find(playlist => playlist.plaid === cookie)) &&
			cookie !== localStorage.getItem('mugenPlVal1')
				? cookie
				: playlistList.find(playlist => playlist.flag_current)?.plaid;
	}
	const playlist = await getPlaylistInfo(plaid);
	if (playlist) {
		localStorage.setItem('mugenPlVal2', playlist.plaid);
		dispatch({
			type: FrontendContextAction.PLAYLIST_INFO_RIGHT,
			payload: { playlist },
		});
	}
}

export function setIndexKaraDetail(dispatch: Dispatch<IndexKaraDetail>, indexKaraDetail: number) {
	if (indexKaraDetail >= 0) {
		dispatch({
			type: FrontendContextAction.INDEX_KARA_DETAIL,
			payload: {
				indexKaraDetail,
			},
		});
	}
}

export function setFutureTime(dispatch: Dispatch<FuturTime>, futurTime: string) {
	dispatch({
		type: FrontendContextAction.FUTURE_TIME,
		payload: {
			futurTime,
		},
	});
}

async function getPlaylistInfo(plaid: string) {
	let playlist: DBPL;
	let content: DBPLCBase[] = [];
	if (plaid && !isNonStandardPlaylist(plaid)) {
		try {
			playlist = await commandBackend('getPlaylist', { plaid });
			content = await commandBackend('getPlaylistContentsMicro', { plaid });
		} catch (_) {
			// already display
		}
	} else {
		playlist = { plaid: plaid, name: '', flag_visible: true };
	}
	return { ...playlist, content };
}

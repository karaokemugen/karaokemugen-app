import { FrontendContextAction, FrontendContextStore } from '../types/frontendContext';

export default function (state: FrontendContextStore, action): FrontendContextStore {
	switch (action.type) {
		case FrontendContextAction.FILTER_VALUE:
			if ((action.payload.side === 'left' && action.payload.filterValue !== state.filterValue1) ||
				(action.payload.side === 'right' && action.payload.filterValue !== state.filterValue2)) {
				if (action.payload.side === 'left') {
					return { ...state, filterValue1: action.payload.filterValue };
				} else {
					return { ...state, filterValue2: action.payload.filterValue };
				}
			} else {
				return state;
			}
		case FrontendContextAction.BG_IMAGE:
			return { ...state, backgroundImg: action.payload.backgroundImg };
		case FrontendContextAction.PLAYLIST_INFO_LEFT:
			return { ...state, playlistInfoLeft: action.payload.playlist };
		case FrontendContextAction.PLAYLIST_INFO_RIGHT:
			return { ...state, playlistInfoRight: action.payload.playlist };
		default:
			return state;
	}
}

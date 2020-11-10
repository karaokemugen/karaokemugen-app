import { eventEmitter } from '../../utils/tools';
import { FrontendContextAction, FrontendContextStore } from '../types/frontendContext';

let timer:NodeJS.Timeout;

export default function (state: FrontendContextStore, action): FrontendContextStore {
	switch (action.type) {
	case FrontendContextAction.CURRENT_BL_SET:
		return { ...state, currentBlSet: action.payload.currentBlSet };
	case FrontendContextAction.FILTER_VALUE:
		clearTimeout(timer);
		timer = setTimeout(() => {
			eventEmitter.emitChange('playlistContentsUpdatedFromClient', action.payload.idPlaylist);
		}, 1000);
		if (action.payload.side === 1) {
			return { ...state, filterValue1: action.payload.filterValue };
		} else {
			return { ...state, filterValue2: action.payload.filterValue };
		}
	case FrontendContextAction.POS_PLAYING:
		if (action.payload.side === 1) {
			return { ...state, posPlaying1: action.payload.posPlaying };
		} else {
			return { ...state, posPlaying2: action.payload.posPlaying };
		}
	case FrontendContextAction.BG_IMAGE:
		return { ...state, backgroundImg: action.payload.backgroundImg };
	default:
		return state;
	}
}

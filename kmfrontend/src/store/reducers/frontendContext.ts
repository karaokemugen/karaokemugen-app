import { eventEmitter } from '../../utils/tools';
import { FrontendContextAction, FrontendContextStore } from '../types/frontendContext';

let timer: NodeJS.Timeout;

export default function (state: FrontendContextStore, action): FrontendContextStore {
	switch (action.type) {
		case FrontendContextAction.FILTER_VALUE:
			clearTimeout(timer);
			if ((action.payload.side === 'left' && action.payload.filterValue !== state.filterValue1) ||
				(action.payload.side === 'right' && action.payload.filterValue !== state.filterValue2)) {
				timer = setTimeout(() => {
					eventEmitter.emitChange('playlistContentsUpdatedFromClient', action.payload.idPlaylist);
				}, 1000);
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
		default:
			return state;
	}
}

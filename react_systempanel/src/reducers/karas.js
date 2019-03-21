import {
	KARAS_LOAD_LOCAL,
	KARAS_FILTER_LOCAL,
	KARAS_LOAD_ONLINE,
	KARAS_FILTER_ONLINE,
	KARAS_SET_IS_SEARCHING,
	KARAS_LOAD_DOWNLOAD_QUEUE,
	KARAS_DOWNLOAD_PROGRESS_UPDATE,
	KARAS_DOWNLOAD_START,
	KARAS_DOWNLOAD_PAUSE
} from '../actions/karas';

const defaultState = {
	localKaras: [],
	onlineKaras: [],
	downloadQueue: [],
	downloadState: 'pause',
	isWatchingDownloadQueue: false,
	isSearching: false
};

// Selectors
export const fetchLocalKaras = state => {
	return state.karas.localKaras;
};

export const fetchLocalKara = (state, kid) => {
	const localKaras = fetchLocalKaras(state);
	return localKaras.find(k => k.kid === kid);
};

export const fetchDownloadQueue = state => {
	return state.karas.downloadQueue;
};

export default function(state = defaultState, action) {
	switch (action.type) {
	case KARAS_LOAD_LOCAL:
		return {
			...state,
			localKaras: action.payload
		};

	case KARAS_LOAD_ONLINE:
		return {
			...state,
			onlineKaras: action.payload
		};

	case KARAS_LOAD_DOWNLOAD_QUEUE:
		return {
			...state,
			downloadQueue: action.payload
		};

	case KARAS_DOWNLOAD_START:
		return {
			...state,
			downloadState: 'start'
		};

	case KARAS_DOWNLOAD_PAUSE:
		return {
			...state,
			downloadState: 'pause'
		};

	case KARAS_SET_IS_SEARCHING:
		return {
			...state,
			isSearching: action.payload
		};
	case KARAS_DOWNLOAD_PROGRESS_UPDATE:
		// Would have been better if it was a more exact update to the store
		return {
			...state,
			downloadQueue: action.payload
		};
		/**
		 * Some actions don't yet need to change the state but might,
		 * example filters may or may not be stored in the store.
		 * So for now it'll do the same as default:
		 */
		// case KARAS_FILTER_LOCAL:
		// case KARAS_FILTER_ONLINE:
	default:
		return state;
	}
}

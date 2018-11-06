import {
	KARAS_LOAD_LOCAL,
	KARAS_FILTER_LOCAL,
	KARAS_LOAD_ONLINE,
	KARAS_FILTER_ONLINE,
	KARAS_TOGGLE_WATCH_DOWNLOAD,
	KARAS_SET_IS_SEARCHING,
	KARAS_LOAD_DOWNLOAD_QUEUE
} from '../actions/karas';

const defaultState = {
	localKaras: [],
	onlineKaras: [],
	downloadQueue: [],
	isWatchingDownloadQueue: false,
	isSearching: false
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

	case KARAS_TOGGLE_WATCH_DOWNLOAD:
		return {
			...state,
			isWatchingDownloadQueue: !state.isWatchingDownloadQueue
		};

	case KARAS_SET_IS_SEARCHING:
		return {
			...state,
			isSearching: action.payload
		};
		/**
		 * Some actions don't yet need to change the state but might,
		 * example filters may or may not be stored in the store.
		 * So for now it'll do the same as default:
		 */
	case KARAS_FILTER_LOCAL:
	case KARAS_FILTER_ONLINE:
	default:
		return state;
	}
}

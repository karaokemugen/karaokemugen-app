import {
	KARAS_LOAD_LOCAL,
	KARAS_FILTER_LOCAL,
	KARAS_LOAD_ONLINE,
	KARAS_FILTER_ONLINE
} from '../actions/karas';

export default function(state = { localKaras: [], onlineKaras: [] }, action) {
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

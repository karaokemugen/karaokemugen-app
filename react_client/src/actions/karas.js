export const KARAS_LOAD_LOCAL = 'KARAS_LOAD_LOCAL';
export const KARAS_FILTER_LOCAL = 'KARAS_FILTER_LOCAL';

export const KARAS_FILTER_ONLINE = 'KARAS_FILTER_ONLINE';
export const KARAS_LOAD_ONLINE = 'KARAS_LOAD_RECENT_ONLINE';

// Runs a filter against the karas, {} || null will get all karas
export function filterLocalKaras(filter) {
	return {
		type: KARAS_FILTER_LOCAL,
		payload: filter
	};
}

// Action to put the localKaras into the redux store
export function loadLocalKaras(localKaras) {
	return {
		type: KARAS_LOAD_LOCAL,
		payload: localKaras
	};
}

// Fetch recent karas from kara.moe. Defaults to recent if no filter is applied (for now)
export function filterOnlineKaras(filter = 'RECENT') {
	return {
		type: KARAS_FILTER_ONLINE,
		payload: filter
	};
}

// Action to put the onlineKaras into the redux store
export function loadOnlineKaras(onlineKaras) {
	return {
		type: KARAS_LOAD_ONLINE,
		payload: onlineKaras
	};
}
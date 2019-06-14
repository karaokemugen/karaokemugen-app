export const KARAS_LOAD_LOCAL = 'KARAS_LOAD_LOCAL';
export const KARAS_FILTER_LOCAL = 'KARAS_FILTER_LOCAL';
export const KARAS_DELETE_KARA = 'KARAS_DELETE_KARA';

export const KARAS_FILTER_ONLINE = 'KARAS_FILTER_ONLINE';
export const KARAS_LOAD_ONLINE = 'KARAS_LOAD_RECENT_ONLINE';

export const KARAS_LOAD_DOWNLOAD_QUEUE = 'KARAS_LOAD_DOWNLOAD_QUEUE';

export const KARAS_SET_IS_SEARCHING = 'KARAS_SET_IS_SEARCHING';

export const KARAS_DOWNLOAD_ADD_TO_QUEUE = 'KARAS_DOWNLOAD_ADD_TO_QUEUE';
export const KARAS_DOWNLOAD_PROGRESS_UPDATE = 'KARAS_DOWNLOAD_PROGRESS_UPDATE';
export const KARAS_DOWNLOAD_START = 'KARAS_DOWNLOAD_START';
export const KARAS_DOWNLOAD_PAUSE = 'KARAS_DOWNLOAD_PAUSE';

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

export function deleteKara(kid) {
	return {
		type: KARAS_DELETE_KARA,
		payload: kid
	};
}

// Fetch recent karas from kara.moe. Defaults to recent if no filter is applied (for now)
export function filterOnlineKaras(filter) {
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

export function setIsSearching(isSearching) {
	return {
		type: KARAS_SET_IS_SEARCHING,
		payload: isSearching
	};
}

export function downloadSong(kid) {
	return {
		type: KARAS_DOWNLOAD_ADD_TO_QUEUE,
		payload: kid
	};
}

export function downloadStart() {
	return {
		type: KARAS_DOWNLOAD_START,
		payload: null
	};
}

export function downloadPause() {
	return {
		type: KARAS_DOWNLOAD_PAUSE,
		payload: null
	};
}
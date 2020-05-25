export enum Navigation {
	INFO_MSG='info_msg',
	ERROR_MSG='error_msg',
	LOADING='loading'
}

export function infoMessage(message) {
	return { type: Navigation.INFO_MSG, message: message };
}

export function errorMessage(message) {
	return { type: Navigation.ERROR_MSG, message: message };
}

export function loading(active) {
	return { type: Navigation.LOADING, active: active };
}

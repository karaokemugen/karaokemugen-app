export const INFO_MSG = 'info_msg';
export const WARN_MSG = 'warn_msg';
export const ERROR_MSG = 'error_msg';
export const DISMISS_ALL = 'dismiss_all';

export const LOADING = 'loading';

export function infoMessage(message) {
	return { type: INFO_MSG, message: message };
}

export function warnMessage(message) {
	return { type: WARN_MSG, message: message };
}

export function errorMessage(message) {
	return { type: ERROR_MSG, message: message };
}

export function dismissAll() {
	return { type: DISMISS_ALL };
}

export function loading(active) {
	return { type: LOADING, active: active };
}

export const INFO_MSG = 'info_msg';
export const WARN_MSG = 'warn_msg';
export const ERROR_MSG = 'error_msg';
export const DISMISS_INFO = 'dismiss_info';
export const DISMISS_WARN = 'dismiss_warn';
export const DISMISS_ERROR = 'dismiss_error';

export function infoMessage(message) {
	return { type: INFO_MSG, message: message };
}

export function warnMessage(message) {
	return { type: WARN_MSG, message: message };
}

export function errorMessage(message) {
	return { type: ERROR_MSG, message: message };
}

export function dismissInfo() {
	return { type: DISMISS_INFO };
}

export function dismissWarn() {
	return { type: DISMISS_WARN };
}

export function dismissError() {
	return { type: DISMISS_ERROR };
}

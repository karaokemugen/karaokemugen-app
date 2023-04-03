import { APIMessageType } from '../lib/types/frontend.js';
import logger from '../lib/utils/logger.js';

export function APIMessage(code: string, data?: any): APIMessageType {
	return {
		code,
		data,
	};
}

export function errMessage(code: string, message?: any) {
	logger.error(`${code}`, { service: 'API', obj: message });
}

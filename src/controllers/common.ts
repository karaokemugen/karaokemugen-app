import { APIMessageType } from '../lib/types/frontend';
import logger from '../lib/utils/logger';

export function APIMessage(code: string, data?: any): APIMessageType {
	return {
		code,
		data,
	};
}

export function errMessage(code: string, message?: any) {
	logger.error(`${code}`, { service: 'API', obj: message });
}

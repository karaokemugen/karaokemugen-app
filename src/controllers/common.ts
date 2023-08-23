import logger from '../lib/utils/logger.js';

export function errMessage(code: string, message?: any) {
	logger.error(`${code}`, { service: 'API', obj: message });
}

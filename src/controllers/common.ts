import { APIMessageType } from '../lib/types/frontend';
import logger from '../lib/utils/logger';

export function APIMessage(code: string, data?: any): APIMessageType {
	return {
		code: code,
		data: data
	};
}

export function errMessage(code: string, message?: string) {
	logger.error(`[API] ${code} : ${message}`);
}

/**
 * @apiDefine admin Admin access only
 * Requires authorization token from admin user to use this API
 */
/**
 * @apiDefine own Own user only
 * Requires authorization token from the user the data belongs to to use this API
 */
/**
 * @apiDefine public Public access
 * This API does not require any privilegied role and can be used by anyone logged.
 */
/**
 * @apiDefine NoAuth No auth required
 * Authorization header is not required.
 */
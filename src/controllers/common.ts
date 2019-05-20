export function errMessage(code: any, message?: string, args?: any) {
	return {
		code: code,
		args: args,
		message: message
	};
}

export function OKMessage(data: any, code?: any, args?: any) {
	return {
		code: code,
		args: args,
		data: data,
	};
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
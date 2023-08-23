import { APIMessage } from '../lib/services/frontend.js';
import logger from '../lib/utils/logger.js';
import { decodeJwtToken } from '../services/user.js';
import { checkValidUser } from './middlewares.js';

export function requireHTTPAuth(req: any, res: any, next: any) {
	if (req.get('authorization')) {
		req.token = decodeJwtToken(req.get('authorization'));
		next();
	} else {
		res.status(401).json(APIMessage('USER_UNKNOWN'));
	}
}

export function requireValidUser(req: any, res: any, next: any) {
	req.authToken = req.token;
	checkValidUser(req.token)
		.then(user => {
			req.user = user;
			next();
		})
		.catch(err => {
			logger.error(`Error checking user : ${JSON.stringify(req.token)}`, { service: 'API', obj: err });
			res.status(403).json(APIMessage('USER_UNKNOWN'));
		});
}

import {getConfig} from '../../_utils/config';
import {decode} from 'jwt-simple';

export const requireWebappLimitedNoAuth = (req, res, next) => {
	+getConfig().WebappMode > 0
		? next()
		: res.status(503).send('API is in restricted mode');
};

export const requireWebappLimited = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	+getConfig().WebappMode > 0 || token.role === 'admin'
		? next()
		: res.status(503).send('API is in restricted mode');
};

export const requireWebappOpen = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	+getConfig().WebappMode > 1 || token.role === 'admin'
		? next()
		: res.status(503).send('API is in restricted mode');
};
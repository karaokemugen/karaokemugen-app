import {getConfig} from '../../_utils/config';
import {decode} from 'jwt-simple';

export const requireWebappLimitedNoAuth = (req, res, next) => {
	+getConfig().Frontend.Mode > 0
		? next()
		: res.status(503).send('API is in restricted mode');
};

export const requireWebappLimited = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	+getConfig().Frontend.Mode > 0 || token.role === 'admin'
		? next()
		: res.status(503).send('API is in restricted mode');
};

export const requireWebappOpen = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	+getConfig().Frontend.Mode > 1 || token.role === 'admin'
		? next()
		: res.status(503).send('API is in restricted mode');
};
import {getConfig} from '../_common/utils/config';
import {decode} from 'jwt-simple';

export const requireWebappLimitedNoAuth = (req, res, next) => {
	if (+getConfig().WebappMode > 0) {
		next();
	} else {
		res.status(503).send('API is in restricted mode');
	}
};

export const requireWebappLimited = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	if (+getConfig().WebappMode > 0 || token.role === 'admin') {
		next();
	} else {
		res.status(503).send('API is in restricted mode');
	}
};

export const requireWebappOpen = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	if (+getConfig().WebappMode > 1 || token.role === 'admin') {
		next();
	} else {
		res.status(503).send('API is in restricted mode');
	}
};
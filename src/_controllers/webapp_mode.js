import {getConfig} from '../_common/utils/config';

export const requireWebappLimited = (req, res, next) => {	
	if (getConfig().WebappMode > 0) {
		next();
	} else {
		res.status(503).send('API is in restricted mode');
	}
};

export const requireWebappOpen = (req, res, next) => {	
	if (getConfig().WebappMode > 1) {
		next();
	} else {
		res.status(503).send('API is in restricted mode');
	}
};
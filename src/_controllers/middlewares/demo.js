import {getConfig} from '../../_utils/config';

export const requireNotDemo = (req, res, next) => {
	if (!getConfig().isDemo) {
		next();
	} else {
		res.status(503).send('Not allowed in demo mode');
	}
};

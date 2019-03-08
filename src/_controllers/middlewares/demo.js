import {getConfig} from '../../_utils/config';

export const requireNotDemo = (req, res, next) => {
	!getConfig().isDemo
		? next()
		: res.status(503).send('Not allowed in demo mode');
};

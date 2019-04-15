import {getState} from '../../_utils/state';

export const requireNotDemo = (req, res, next) => {
	!getState().isDemo
		? next()
		: res.status(503).send('Not allowed in demo mode');
};

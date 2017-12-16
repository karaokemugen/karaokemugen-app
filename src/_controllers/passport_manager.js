import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';

export const requireAuth = passport.authenticate('jwt', { session: false });
export const requireAdmin = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	if (token.role === 'admin') {
		next();
	} else {
		res.status(403).send('Only admin can use this function');
	}
};


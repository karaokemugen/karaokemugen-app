import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {findUserByName} from '../_services/user';

export const requireAuth = passport.authenticate('jwt', { session: false });
export const requireAdmin = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	if (token.role === 'admin') {
		next();
	} else {
		res.status(403).send('Only admin can use this function');
	}
};
export const requireAdminOrOwn = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	findUserByName(token.username)
		.then((userdata) => {
			if (token.role === 'admin' || req.params.username === userdata.login ) {
				next();
			} else {
				res.status(403).send('Only admin or authorized user can use this function');
			}
		})
		.catch(() => {
			res.status(403).send('User logged in unknown');
		});
	
};


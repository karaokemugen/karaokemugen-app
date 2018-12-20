import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../_utils/config';
import {findUserByName, updateLastLoginName} from '../_services/user';

export const requireAuth = passport.authenticate('jwt', { session: false });

export const updateUserLoginTime = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	updateLastLoginName(token.username);
	next();
};

export const requireValidUser = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	req.authToken = token;
	findUserByName(token.username)
		.then((user) => {
			if (!user) {
				res.status(403).send('User logged in unknown');
			} else {
				next();
			}
		})
		.catch(() => {
			res.status(403).send('User logged in unknown');
		});
};

export const requireAdmin = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	if (token.role === 'admin') {
		next();
	} else {
		res.status(403).send('Only admin can use this function');
	}
};



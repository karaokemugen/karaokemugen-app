import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {findUserByName, updateLastLoginName} from '../_services/user';
import { getRemoteToken } from '../_dao/user';

export const requireAuth = passport.authenticate('jwt', { session: false });

export const updateUserLoginTime = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	updateLastLoginName(token.username);
	next();
};

export const requireValidUser = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	req.authToken = token;

	// If user is remote, see if we have a remote token ready.
	if (token.username.includes('@')) {
		if (getRemoteToken(token.username)) {
			// Remote token exists, no problem here
		} else {
			res.status(401).send('User is remote and needs to reconnect here');
			return false;
		}
	}

	findUserByName(token.username)
		.then((user) => {
			if (!user) {
				res.status(401).send('User logged in unknown');
			} else {
				next();
			}
		})
		.catch(() => {
			res.status(401).send('User logged in unknown');
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



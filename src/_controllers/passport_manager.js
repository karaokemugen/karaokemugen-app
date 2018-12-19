import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {findUserByName, updateLastLoginName, remoteCheckAuth} from '../_services/user';
import { getRemoteToken, upsertRemoteToken } from '../_dao/user';

export const requireAuth = passport.authenticate('jwt', { session: false });

export const updateUserLoginTime = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	updateLastLoginName(token.username);
	next();
};

export async function checkValidUser(token, onlineToken) {
	// If user is remote, see if we have a remote token ready.
	if (token.username.includes('@')) {
		const remoteToken = getRemoteToken(token.username);
		if (remoteToken && remoteToken.token === onlineToken) {
			// Remote token exists, no problem here
		} else {
			// Remote token does not exist, we're going to verify it and add it if it does work
			try {
				await remoteCheckAuth(token.username.split('@')[1], onlineToken);
				upsertRemoteToken(token.username, onlineToken);
			} catch(err) {
				throw err;
			}
		}
	}
	if (await findUserByName(token.username)) {
		return true;
	} else {
		throw false;
	}
}

export const requireValidUser = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	const onlineToken = req.get('onlineAuthorization');
	req.authToken = token;
	checkValidUser(token, onlineToken)
		.then(() => {
			next();
		})
		.catch((err) => {
			res.status(err.statusCode).send('User logged in unknown');
		});
};

export const requireAdmin = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	token.role === 'admin' ? next() : res.status(403).send('Only admin can use this function');
};



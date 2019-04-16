import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../../_utils/config';
import {findUserByName, updateLastLoginName, remoteCheckAuth, fetchAndUpdateRemoteUser} from '../../_services/user';
import { getRemoteToken, upsertRemoteToken } from '../../_dao/user';
import { fetchAndAddFavorites } from '../../_services/favorites';
import logger from 'winston';

export const requireAuth = passport.authenticate('jwt', { session: false });

export const updateUserLoginTime = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	updateLastLoginName(token.username);
	next();
};

export async function checkValidUser(token, onlineToken) {
	// If user is remote, see if we have a remote token ready.
	const user = await findUserByName(token.username);
	if (user) {
		if (token.username.includes('@') && +getConfig().Online.Users) {
			const remoteToken = getRemoteToken(token.username);
			if (remoteToken && remoteToken.token === onlineToken) {
				// Remote token exists, no problem here
				return true;
			} else {
				// Remote token does not exist, we're going to verify it and add it if it does work
				try {
					// Firing this first to avoid multiple triggers, will get canceled if auth is not OK.
					upsertRemoteToken(token.username, onlineToken);
					if (await remoteCheckAuth(token.username.split('@')[1], onlineToken)){
						fetchAndAddFavorites(token.username.split('@')[1], onlineToken, token.username);
						fetchAndUpdateRemoteUser(token.username, null, onlineToken);
						return user;
					} else {
						// Cancelling remote token.
						upsertRemoteToken(token.username, null);
					}
				} catch(err) {
					upsertRemoteToken(token.username, null);
					logger.warn(`[RemoteUser] Failed to check remote auth (user logged in as local only) : ${err}`);
					throw false;
				}
			}
		}
		return user;
	} else {
		throw false;
	}
}

export const requireRegularUser = (req, res, next) => {
	req.user.type === 2
		? res.status(401).send('Guests cannot use favorites')
		: next();
};

export const requireValidUser = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	const onlineToken = req.get('onlineAuthorization');
	req.authToken = token;
	checkValidUser(token, onlineToken)
		.then(user => {
			req.user = user;
			next();
		})
		.catch(err => {
			res.status(404).send('User logged in unknown');
		});
};

export const requireAdmin = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	token.role === 'admin'
		? next()
		: res.status(403).send('Only admin can use this function');
};



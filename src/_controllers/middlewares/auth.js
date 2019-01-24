import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {findUserByName, updateLastLoginName, remoteCheckAuth, fetchAndUpdateRemoteUser} from '../_services/user';
import { getRemoteToken, upsertRemoteToken } from '../_dao/user';
import { fetchAndAddFavorites } from '../_services/favorites';

export const requireAuth = passport.authenticate('jwt', { session: false });

export const updateUserLoginTime = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	updateLastLoginName(token.username);
	next();
};

export async function checkValidUser(token, onlineToken) {
	// If user is remote, see if we have a remote token ready.
	if (await findUserByName(token.username)) {
		if (token.username.includes('@') && +getConfig().OnlineUsers) {
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
						fetchAndAddFavorites(token.username.split('@')[1], onlineToken, token.username, token.username);
						fetchAndUpdateRemoteUser(token.username, null, onlineToken);
						return true;
					} else {
						// Cancelling remote token.
						upsertRemoteToken(token.username, null);
					}
				} catch(err) {
					upsertRemoteToken(token.username, null);
					throw err;
				}
			}
		}
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
			res.status(404).send('User logged in unknown');
		});
};

export const requireAdmin = (req, res, next) => {
	const token = decode(req.get('authorization'), getConfig().JwtSecret);
	token.role === 'admin' ? next() : res.status(403).send('Only admin can use this function');
};



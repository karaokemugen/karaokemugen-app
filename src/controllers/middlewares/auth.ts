import passport from 'passport';
import {decode} from 'jwt-simple';
import {getConfig} from '../../utils/config';
import {findUserByName, updateLastLoginName, remoteCheckAuth, fetchAndUpdateRemoteUser} from '../../services/user';
import { getRemoteToken, upsertRemoteToken } from '../../dao/user';
import { fetchAndAddFavorites } from '../../services/favorites';
import logger from 'winston';
import {User, Token} from '../../types/user';

export const requireAuth = passport.authenticate('jwt', { session: false });

export const updateUserLoginTime = (req: { get: (arg0: string) => string; }, _res: any, next: () => void) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	updateLastLoginName(token.username);
	next();
};

export async function checkValidUser(token: { username: string; }, onlineToken: Token) {
	// If user is remote, see if we have a remote token ready.
	const user = await findUserByName(token.username);
	if (user) {
		if (token.username.includes('@') && +getConfig().Online.Users) {
			const remoteToken = getRemoteToken(token.username);
			if (remoteToken && remoteToken.token === onlineToken.token) {
				// Remote token exists, no problem here
				return true;
			} else {
				// Remote token does not exist, we're going to verify it and add it if it does work
				try {
					// Firing this first to avoid multiple triggers, will get canceled if auth is not OK.
					upsertRemoteToken(token.username, onlineToken.token);
					if (await remoteCheckAuth(token.username.split('@')[1], onlineToken.token)){
						fetchAndAddFavorites(token.username.split('@')[1], onlineToken.token, token.username);
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

export const requireRegularUser = (req: { user: { type: number; }; }, res: { status: (arg0: number) => { send: (arg0: string) => void; }; }, next: () => void) => {
	req.user.type === 2
		? res.status(401).send('Guests cannot use favorites')
		: next();
};

export const requireValidUser = (req: { get: { (arg0: string): string; (arg0: string): void; }; authToken: any; user: boolean | User; }, res: { status: (arg0: number) => { send: (arg0: string) => void; }; }, next: () => void) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	const onlineToken = req.get('onlineAuthorization');
	req.authToken = token;
	checkValidUser(token, {
		username: null,
		token: onlineToken,
		role: 'user'
	})
		.then(user => {
			req.user = user;
			next();
		})
		.catch(_err => {
			res.status(404).send('User logged in unknown');
		});
};

export const requireAdmin = (req: any, res: any, next: any) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	token.role === 'admin'
		? next()
		: res.status(403).send('Only admin can use this function');
};



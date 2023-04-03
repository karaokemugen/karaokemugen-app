import randomstring from 'randomstring';

import { OldTokenResponse, Role, User } from '../lib/types/user.js';
import { getConfig } from '../lib/utils/config.js';
import logger from '../lib/utils/logger.js';
import { getState, setState } from '../utils/state.js';
import { fetchAndAddFavorites } from './favorites.js';
import { checkPassword, createJwtToken, getUser, updateLastLoginName } from './user.js';
import { fetchAndUpdateRemoteUser } from './userOnline.js';

const service = 'Auth';

/** Check login and authenticates users */
export async function checkLogin(username: string, password: string): Promise<OldTokenResponse> {
	const conf = getConfig();
	let user: User = {};
	let onlineToken: string;
	username = username.toLowerCase();
	if (username.includes('@') && +conf.Online.Users) {
		try {
			// If username has a @, check its instance for existence
			// If OnlineUsers is disabled, accounts are connected with
			// their local version if it exists already.
			const res = await fetchAndUpdateRemoteUser(username, password, undefined, true);
			onlineToken = res.onlineToken;
			if (onlineToken) {
				// Download and add all favorites
				await fetchAndAddFavorites(username, onlineToken);
			}
		} catch (err) {
			logger.error(`Failed to authenticate ${username}`, { service, obj: err });
		}
	}

	user = await getUser(username, true);
	if (!user) throw false;
	if (user.type < 2 && !(await checkPassword(user, password))) throw false;
	if (user.type === 2 && !getConfig().Frontend.AllowGuestLogin) throw false;
	const role = getRole(user);
	updateLastLoginName(username);
	return {
		token: createJwtToken(username, role, conf),
		onlineToken,
		username,
		role,
	};
}

export function resetSecurityCode() {
	setState({ securityCode: generateSecurityCode() });
	const securityCodeStr = `${getState().securityCode}`.padStart(6, '0');
	logger.warn(`SECURITY CODE : ${securityCodeStr}`, { service });
}

function generateSecurityCode(): number {
	return +randomstring.generate({
		length: 6,
		charset: 'numeric',
	});
}

/** Get role depending on user type */
function getRole(user: User): Role {
	if (+user.type === 2) return 'guest';
	if (+user.type === 0) return 'admin';
	if (+user.type === 1) return 'user';
	return 'guest';
}

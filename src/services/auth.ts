import randomstring from 'randomstring';

import { OldTokenResponse, Role, User } from '../lib/types/user.js';
import { getConfig } from '../lib/utils/config.js';
import logger from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { getState, setState } from '../utils/state.js';
import { fetchAndAddFavorites } from './favorites.js';
import { checkPassword, createJwtToken, getUser, updateLastLoginName } from './user.js';
import { fetchAndUpdateRemoteUser } from './userOnline.js';

const service = 'Auth';

/** Check login and authenticates users */
export async function checkLogin(
	username: string,
	password: string,
	newAccountSecurityCode?: number
): Promise<OldTokenResponse> {
	if (username) username = decodeURI(username.trim());
	const conf = getConfig();
	let onlineToken: string;
	username = username.toLowerCase().trim();
	let user: User = { login: username };
	if (username.includes('@') && +conf.Online.RemoteUsers.Enabled) {
		try {
			// If username has a @, check its instance for existence
			// If OnlineUsers is disabled, accounts are connected with
			// their local version if it exists already.
			const res = await fetchAndUpdateRemoteUser(username, password, undefined, true, newAccountSecurityCode);
			onlineToken = res.onlineToken;
			if (onlineToken) {
				// Download and add all favorites
				await fetchAndAddFavorites(username, onlineToken);
			}
		} catch (err) {
			if (err.message === 'USER_CREATION_DISABLED') throw err;
			logger.error(`Failed to authenticate ${username}`, { service, obj: err });
		}
	}

	user = await getUser(username, true, true);
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

export function resetNewAccountCode() {
	setState({ newAccountCode: generateSecurityCode() });
	const newAccountCodeStr = `${getState().newAccountCode}`.padStart(6, '0');
	logger.warn(`NEW ACCOUNT CODE : ${newAccountCodeStr}`, { service });
	emitWS('settingsUpdated');
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

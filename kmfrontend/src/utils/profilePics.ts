import { User } from '../../../src/lib/types/user';
import blankAvatar from '../assets/blank.png';
import { GlobalContextInterface } from '../store/context';
import { commandBackend, getSocket, isRemote } from './socket';
import { getProtocolForOnline } from './tools';

const cache: Map<string, string> = new Map();

getSocket().on('userUpdated', login => cache.delete(login));

export function syncGenerateProfilePicLink(user: User) {
	if (isRemote()) {
		if (user?.login.includes('@') && cache.has(user.login)) {
			// Retrieve cache entry
			return cache.get(user.login);
		} else if (user.type === 2) {
			return `/guests/${user.login}.jpg`;
		} else {
			return blankAvatar;
		}
	} else {
		if (user.avatar_file) {
			return `/avatars/${user.avatar_file}`;
		} else {
			return blankAvatar;
		}
	}
}

export async function generateProfilePicLink(user: User, context: GlobalContextInterface): Promise<string> {
	// Retrieve cache entry
	if (cache.has(user.login)) {
		return cache.get(user.login);
	} else if (isRemote()) {
		if (user?.login.includes('@')) {
			const [login, instance] = user.login.split('@');
			const data: User = await fetch(
				`${getProtocolForOnline(context, instance)}://${instance}/api/users/${encodeURIComponent(login.trim())}`
			).then(res => res.json());
			if (data.avatar_file) {
				const url = `${getProtocolForOnline(context, instance)}://${instance}/avatars/${data.avatar_file}`;
				cache.set(user.login, url);
				return url;
			} else {
				cache.set(user.login, blankAvatar);
				return blankAvatar;
			}
		} else if (user.type === 2) {
			return `/guests/${user.login}.jpg`;
		} else {
			return blankAvatar;
		}
	} else {
		if (user.avatar_file) {
			return `/avatars/${user.avatar_file}`;
		} else {
			try {
				const data: User = await commandBackend('getUser', { username: user.login });
				const path = `/avatars/${data.avatar_file}`;
				cache.set(user.login, path);
				return path;
			} catch (e) {
				return blankAvatar;
			}
		}
	}
}

export function updateCache(user: User, url: string) {
	cache.set(user.login, url);
}

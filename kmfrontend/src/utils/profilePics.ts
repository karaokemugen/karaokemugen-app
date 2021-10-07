import slugify from 'slugify';

import { User } from '../../../src/lib/types/user';
import blankAvatar from '../assets/blank.png';
import { getSocket, isRemote } from './socket';

const cache: Map<string, string> = new Map();

getSocket().on('userUpdated', (login) => cache.delete(login));

export async function generateProfilePicLink(user: User): Promise<string> {
	if (isRemote()) {
		if (user?.login.includes('@')) {
			// Retrieve cache entry
			if (cache.has(user.login)) {
				return cache.get(user.login);
			}
			const [login, instance] = user.login.split('@');
			const data: User = await fetch(`https://${instance}/api/users/${encodeURIComponent(login)}`).then((res) =>
				res.json()
			);
			if (data.avatar_file) {
				const url = `https://${instance}/avatars/${data.avatar_file}`;
				cache.set(user.login, url);
				return url;
			} else {
				cache.set(user.login, blankAvatar);
				return blankAvatar;
			}
		} else if (user.type === 2) {
			return `/guests/${slugify(user.login, {
				lower: true,
				remove: /['"!,?()]/g,
			})}.jpg`;
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

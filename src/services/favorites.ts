import { deleteFavorites, insertFavorites, truncateFavorites } from '../dao/favorites.js';
import { DBKara } from '../lib/types/database/kara.js';
import { KaraList, KaraParams } from '../lib/types/kara.js';
import { getConfig } from '../lib/utils/config.js';
import { uuidRegexp } from '../lib/utils/constants.js';
import HTTP from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { FavExport, FavExportContent } from '../types/favorites.js';
import sentry from '../utils/sentry.js';
import { getKaras, isAllKaras } from './kara.js';
import { getUser } from './user.js';

const service = 'Favorites';

export async function getFavorites(params: KaraParams): Promise<KaraList> {
	try {
		profile('getFavorites');
		return await getKaras(params);
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('getFavorites');
	}
}

export async function fetchAndAddFavorites(username: string, token: string) {
	try {
		const instance = username.split('@')[1];
		const res = await HTTP(`https://${instance}/api/favorites`, {
			headers: {
				authorization: token,
			},
		});
		const favorites = {
			Header: {
				version: 1,
				description: 'Karaoke Mugen Favorites List File',
			},
			Favorites: res.data as FavExportContent[],
		};
		await importFavorites(favorites, username, token, false, false);
	} catch (err) {
		logger.error(`Error getting remote favorites for ${username}`, { service, obj: err });
	}
}

export async function manageFavoriteInInstanceBatch(
	action: 'POST' | 'DELETE',
	username: string,
	kids: string[],
	token: string
) {
	await Promise.all(kids.map(kid => manageFavoriteInInstance(action, username, kid, token)));
}

export async function addToFavorites(username: string, kids: string[], onlineToken?: string, updateRemote = true) {
	try {
		profile('addToFavorites');
		username = username.toLowerCase();
		await insertFavorites(kids, username);
		if (username.includes('@') && onlineToken && getConfig().Online.Users && updateRemote) {
			await manageFavoriteInInstanceBatch('POST', username, kids, onlineToken);
		}
		emitWS('favoritesUpdated', username);
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('addToFavorites');
	}
}

export async function convertToRemoteFavorites(username: string, token: string) {
	// This is called when converting a local account to a remote one
	// We thus know no favorites exist remotely.
	if (!getConfig().Online.Users) return true;
	const favorites = await getFavorites({
		filter: null,
		lang: null,
		username,
		userFavorites: username,
	});
	const localFavorites = favorites.content.map(fav => fav.kid);
	if (localFavorites.length > 0) {
		await manageFavoriteInInstanceBatch('POST', username, localFavorites, token);
	}
}

export async function removeFavorites(username: string, kids: string[], token: string) {
	try {
		profile('deleteFavorites');
		username = username.toLowerCase();
		await deleteFavorites(kids, username);
		if (username.includes('@') && getConfig().Online.Users) {
			manageFavoriteInInstanceBatch('DELETE', username, kids, token);
		}
		emitWS('favoritesUpdated', username);
	} catch (err) {
		throw { message: err };
	} finally {
		profile('deleteFavorites');
	}
}

async function manageFavoriteInInstance(action: 'POST' | 'DELETE', username: string, kid: string, token: string) {
	// If OnlineUsers is disabled, we return early and do not try to update favorites online.
	if (!getConfig().Online.Users) return true;
	const instance = username.split('@')[1];
	try {
		return await HTTP(`https://${instance}/api/favorites/${kid}`, {
			method: action,
			headers: {
				authorization: token,
			},
		});
	} catch (err) {
		logger.error(`Unable to ${action} favorite ${kid} on ${username}'s online account`, {
			service,
			obj: err,
		});
	}
}

export async function exportFavorites(username: string) {
	username = username.toLowerCase();
	const favs = await getFavorites({
		userFavorites: username,
	});
	if (favs.content.length === 0) throw { code: 404, msg: 'No favorites' };
	return {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List File',
		},
		Favorites: favs.content.map(k => {
			// Only the kid property is mandatory, the rest is just decoration so the person can know which song is which in the file
			return {
				kid: k.kid,
				titles: k.titles,
				songorder: k.songorder,
				serie: k.series.map(s => s.name).join(' '),
				songtype: k.songtypes.map(s => s.name).join(' '),
				language: k.langs.map(s => s.name).join(' '),
			};
		}),
	};
}

export async function importFavorites(
	favs: FavExport,
	username: string,
	token?: string,
	emptyBefore = false,
	updateRemote = true
) {
	username = username.toLowerCase();
	if (favs.Header.version !== 1) throw { code: 400, msg: 'Incompatible favorites version list' };
	if (favs.Header.description !== 'Karaoke Mugen Favorites List File') {
		throw { code: 400, msg: 'Not a favorites list' };
	}
	if (!Array.isArray(favs.Favorites)) throw { code: 400, msg: 'Favorites item is not an array' };
	if (favs.Favorites.some(f => !uuidRegexp.test(f.kid))) {
		throw { code: 400, msg: 'One item in the favorites list is not a UUID' };
	}
	// Stripping favorites from unknown karaokes in our database to avoid importing them
	try {
		if (emptyBefore) {
			await truncateFavorites(username);
		}
		const favorites = favs.Favorites.map(f => f.kid);
		const [karasUnknown, userFavorites] = await Promise.all([
			isAllKaras(favorites),
			getFavorites({ userFavorites: username }),
		]);
		// Removing favorites already added
		const mappedUserFavorites = userFavorites.content.map(uf => uf.kid);
		const favoritesToAdd = favorites.filter(f => !mappedUserFavorites.includes(f));
		if (favoritesToAdd.length > 0) await addToFavorites(username, favoritesToAdd, token, updateRemote);
		emitWS('favoritesUpdated', username);
		return { karasUnknown };
	} catch (err) {
		logger.error('Unable to import favorites', { service, obj: err });
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	}
}

/* Get favorites from a user list */
export async function getAllFavorites(userList: string[]): Promise<DBKara[]> {
	const faves: DBKara[] = [];
	for (let user of userList) {
		user = user.toLowerCase();
		if (!(await getUser(user))) {
			logger.warn(`Username ${user} does not exist`, { service });
		} else {
			const favs = await getFavorites({
				userFavorites: user,
			});
			for (const f of favs.content) {
				if (!faves.find(fav => fav.kid === f.kid)) {
					faves.push({
						...f,
						username: user,
					});
				}
			}
		}
	}
	return faves;
}

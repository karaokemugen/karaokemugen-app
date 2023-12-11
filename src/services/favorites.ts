import { deleteFavorites, insertFavorites, selectFavoritesMicro, truncateFavorites } from '../dao/favorites.js';
import { DBKara } from '../lib/types/database/kara.js';
import { KaraList, KaraParams } from '../lib/types/kara.js';
import { getConfig } from '../lib/utils/config.js';
import { uuidRegexp } from '../lib/utils/constants.js';
import { ErrorKM } from '../lib/utils/error.js';
import HTTP from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { FavExport, FavExportContent } from '../types/favorites.js';
import sentry from '../utils/sentry.js';
import { getKaras } from './kara.js';
import { getUser } from './user.js';

const service = 'Favorites';

export async function getFavoritesMicro(params: KaraParams) {
	try {
		return await selectFavoritesMicro(params);
	} catch (err) {
		logger.error(`Failed to fetch (micro) favorites for user ${params.username}`, { service });
		sentry.error(err);
		throw new ErrorKM('FAVORITES_VIEW_ERROR', 500);
	}
}

export async function getFavorites(params: KaraParams): Promise<KaraList> {
	try {
		profile('getFavorites');
		return await getKaras(params);
	} catch (err) {
		logger.error(`Failed to fetch favorites for user ${params.username}`, { service });
		sentry.error(err);
		throw new ErrorKM('FAVORITES_VIEW_ERROR', 500);
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
	try {
		await Promise.all(kids.map(kid => manageFavoriteInInstance(action, username, kid, token)));
	} catch (err) {
		logger.error(`Failed to send favorites command ${action} to online favorites for user ${username}`);
		sentry.error(err);
		// Do not throw as this is launched asynchronously
	}
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
		logger.error(`Failed to add to favorites for user ${username}`, { service, obj: err });
		sentry.error(err);
		throw new ErrorKM('FAVORITES_ADDED_ERROR', 500);
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
			manageFavoriteInInstanceBatch('DELETE', username, kids, token).catch(() => {});
		}
		emitWS('favoritesUpdated', username);
	} catch (err) {
		logger.error(`Failed to delete favorites for user ${username}`, { service });
		sentry.error(err);
		throw new ErrorKM('FAVORITES_DELETED_ERROR');
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
	try {
		username = username.toLowerCase();
		const favs = await getFavorites({
			userFavorites: username,
		});
		if (favs.content.length === 0) throw new ErrorKM('FAVORITES_EXPORTED_NO_FAVORITES_ERROR', 404, false);
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
	} catch (err) {
		logger.error('Failed to export favorites', { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('FAVORITES_EXPORTED_ERROR');
	}
}

export async function importFavorites(
	favs: FavExport,
	username: string,
	token?: string,
	emptyBefore = false,
	updateRemote = true
) {
	username = username.toLowerCase();
	if (favs.Header.version !== 1) throw new ErrorKM('FAVORITES_IMPORTED_INCOMPATIBLE_VERSION_ERROR', 400, false);
	if (favs.Header.description !== 'Karaoke Mugen Favorites List File') {
		throw new ErrorKM('FAVORITES_IMPORTED_WRONG_FILETYPE_ERROR', 400, false);
	}
	if (!Array.isArray(favs.Favorites || favs.Favorites.some(f => !uuidRegexp.test(f.kid)))) {
		throw new ErrorKM('FAVORITES_IMPORTED_BAD_DATA_ERROR', 400, false);
	}
	try {
		if (emptyBefore) {
			await truncateFavorites(username);
		}
		const favorites = favs.Favorites.map(f => f.kid);
		const userFavorites = await getFavorites({ userFavorites: username });
		// Removing favorites already added
		const mappedUserFavorites = userFavorites.content.map(uf => uf.kid);
		const favoritesToAdd = favorites.filter(f => !mappedUserFavorites.includes(f));
		if (favoritesToAdd.length > 0) await addToFavorites(username, favoritesToAdd, token, updateRemote);
		emitWS('favoritesUpdated', username);
	} catch (err) {
		logger.error('Unable to import favorites', { service, obj: err });
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('FAVORITES_IMPORTED_ERROR');
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

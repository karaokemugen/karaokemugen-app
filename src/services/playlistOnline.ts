import { PlaylistExport, ServerDBPL } from '../lib/types/playlist.js';
import { getConfig } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import HTTP from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';

const service = 'Online Playlists';

export async function getPlaylistsFromKMServer(
	username: string,
	onlineAuthorization: string,
	filter?: string,
	myPlaylistsOnly = false
): Promise<ServerDBPL[]> {
	const [login, instance] = username.split('@');
	const conf = getConfig().Online;
	try {
		const res = await HTTP.get(`${conf.RemoteUsers.Secure ? 'https' : 'http'}://${instance}/api/playlist`, {
			timeout: conf.Timeout,
			headers: {
				authorization: onlineAuthorization,
			},
			params: {
				byUsername: myPlaylistsOnly ? login : undefined,
				includeUserAsContributor: myPlaylistsOnly,
				filter,
			},
		});
		return res.data as ServerDBPL[];
	} catch (err) {
		if (err.code === 'ECONNABORTED' || err.code === 'EAI_AGAIN') {
			logger.error(`Cannot reach remote ${instance}`, { service, obj: err });
			throw new ErrorKM('REMOTE_SERVER_CONNECTION_ERROR', 408, false);
		} else {
			throw err;
		}
	}
}

export async function getPlaylistFromKMServer(
	username: string,
	onlineAuthorization: string,
	plaid: string
): Promise<PlaylistExport> {
	const instance = username.split('@')[1];
	const conf = getConfig().Online;
	try {
		const res = await HTTP.get(
			`${conf.RemoteUsers.Secure ? 'https' : 'http'}://${instance}/api/playlist/${plaid}/export`,
			{
				timeout: conf.Timeout,
				headers: {
					authorization: onlineAuthorization,
				},
			}
		);
		return res.data as PlaylistExport;
	} catch (err) {
		if (err.code === 'ECONNABORTED' || err.code === 'EAI_AGAIN') {
			logger.error(`Cannot reach remote ${instance}`, { service, obj: err });
			throw new ErrorKM('REMOTE_SERVER_CONNECTION_ERROR', 408, false);
		} else {
			throw err;
		}
	}
}

export async function postPlaylistToKMServer(username: string, onlineAuthorization: string, pl: PlaylistExport) {
	const instance = username.split('@')[1];
	const conf = getConfig().Online;
	// Basic sanity check
	if (!pl.PlaylistContents?.every(plItem => plItem.repository === instance)) {
		throw new ErrorKM('PL_DO_NOT_MATCH_REPO', 422, false);
	}
	await HTTP.post(
		`${conf.RemoteUsers.Secure ? 'https' : 'http'}://${instance}/api/playlist/import`,
		{
			pl,
		},
		{
			timeout: conf.Timeout,
			headers: {
				authorization: onlineAuthorization,
			},
		}
	);
}

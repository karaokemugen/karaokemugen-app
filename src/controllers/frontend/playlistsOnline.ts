import { Socket } from 'socket.io';

import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	getPlaylistFromKMServer,
	getPlaylistsFromKMServer,
	postPlaylistToKMServer,
} from '../../services/playlistOnline.js';
import { runChecklist } from '../middlewares.js';

export default function playlistsOnlineController(router: SocketIOApp) {
	router.route(WS_CMD.GET_PLAYLISTS_FROM_KM_SERVER, async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await getPlaylistsFromKMServer(
				req.token.username,
				req.onlineAuthorization,
				req.body.filter,
				req.body.myPlaylistsOnly
			);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST_FROM_KM_SERVER, async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await getPlaylistFromKMServer(req.token.username, req.onlineAuthorization, req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.POST_PLAYLIST_TO_KM_SERVER, async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await postPlaylistToKMServer(req.token.username, req.onlineAuthorization, req.body.pl);
			return {
				code: 200,
				message: APIMessage('PLAYLIST_EXPORTED_TO_SERVER'),
				data: req.token.username.split('@')[1],
			};
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addCriteria,
	createProblematicSmartPlaylist,
	emptyCriterias,
	getCriterias,
	removeCriteria,
} from '../../services/smartPlaylist.js';
import { APIMessage, errMessage } from '../common.js';
import { runChecklist } from '../middlewares.js';

export default function smartPlaylistsController(router: SocketIOApp) {
	router.route('createProblematicSmartPlaylist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await createProblematicSmartPlaylist();
		} catch (err) {
			const code = 'PROBLEMATIC_SMART_PLAYLIST_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await getCriterias(req.body.plaid, req.langs);
		} catch (err) {
			const code = 'CRITERIAS_GET_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('emptyCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await emptyCriterias(req.body.plaid);
		} catch (err) {
			const code = 'CRITERIAS_EMPTY_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('removeCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await removeCriteria(req.body.criterias);
		} catch (err) {
			const code = 'CRITERIAS_REMOVE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('addCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await addCriteria(req.body.criterias);
		} catch (err) {
			const code = 'CRITERIAS_ADD_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
}

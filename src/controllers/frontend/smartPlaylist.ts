import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addCriteria,
	createProblematicSmartPlaylist,
	emptyCriterias,
	getCriterias,
	removeCriteria,
} from '../../services/smartPlaylist.js';
import { runChecklist } from '../middlewares.js';

export default function smartPlaylistsController(router: SocketIOApp) {
	router.route('createProblematicSmartPlaylist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await createProblematicSmartPlaylist();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await getCriterias(req.body.plaid, req.langs);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('emptyCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await emptyCriterias(req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('removeCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await removeCriteria(req.body.criterias);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('addCriterias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await addCriteria(req.body.criterias);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

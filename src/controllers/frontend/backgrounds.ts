import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { addBackgroundFile, getBackgroundFiles, removeBackgroundFile } from '../../services/backgrounds.js';
import { runChecklist } from '../middlewares.js';

export default function backgroundsController(router: SocketIOApp) {
	router.route('getBackgroundFiles', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getBackgroundFiles(req.body.type);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('addBackground', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await addBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('removeBackground', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await removeBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import { addBackgroundFile, getBackgroundFiles, removeBackgroundFile } from '../../services/backgrounds';
import { runChecklist } from '../middlewares';

export default function backgroundsController(router: SocketIOApp) {
	router.route('getBackgroundFiles', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return getBackgroundFiles(req.body.type);
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route('addBackground', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await addBackgroundFile(req.body.type, req.body.file);
		} catch(err) {
			throw {code: 500};
		}
	});

	router.route('removeBackground', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return removeBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: 500 };
		}
	});
}

import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { findFilesToImport, importBase } from '../../services/importBase.js';
import { runChecklist } from '../middlewares.js';

export default function importBaseController(router: SocketIOApp) {
	router.route('findFilesToImport', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findFilesToImport(req.body.dirname, req.body.template, true);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('importBase', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			importBase(req.body.source, req.body.template, req.body.repoDest);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

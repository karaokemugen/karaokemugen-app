import { Socket } from 'socket.io';

import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { findFilesToImport, importBase } from '../../services/importBase.js';
import { runChecklist } from '../middlewares.js';

export default function importBaseController(router: SocketIOApp) {
	router.route(WS_CMD.FIND_FILES_TO_IMPORT, async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findFilesToImport(req.body.dirname, req.body.template, true);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.IMPORT_BASE, async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			importBase(req.body.source, req.body.template, req.body.repoDest);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

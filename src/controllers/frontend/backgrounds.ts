import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { addBackgroundFile, getBackgroundFiles, removeBackgroundFile } from '../../services/backgrounds.js';
import { runChecklist } from '../middlewares.js';

export default function backgroundsController(router: SocketIOApp) {
	router.route(WS_CMD.GET_BACKGROUND_FILES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getBackgroundFiles(req.body.type);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_BACKGROUND, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await addBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.REMOVE_BACKGROUND, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await removeBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

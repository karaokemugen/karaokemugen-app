import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
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
	router.route(WS_CMD.CREATE_PROBLEMATIC_SMART_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await createProblematicSmartPlaylist();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await getCriterias(req.body.plaid, req.langs);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EMPTY_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await emptyCriterias(req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.REMOVE_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await removeCriteria(req.body.criterias);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			return await addCriteria(req.body.criterias);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

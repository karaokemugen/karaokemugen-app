import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
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
import { check } from '../../lib/utils/validators.js';

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
			check(req.body, z.object({
				plaid: z.uuidv4(),
				langs: z.array(z.string().nullable()).optional(),
			}));
			return await getCriterias(req.body.plaid, req.langs);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EMPTY_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
			}));
			return await emptyCriterias(req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.REMOVE_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			check(req.body, z.object({
				criterias: z.array(z.object({
					type: z.number().int(),
					value: z.any(),
					plaid: z.uuidv4(),
				})),
			}))
			return await removeCriteria(req.body.criterias);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_CRITERIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			// Stronger validation is applied during addCriteria
			check(req.body, z.object({
				criterias: z.array(z.object({
					type: z.number().int(),
					value: z.any(),
					plaid: z.uuidv4(),
				})),
			}))
			return await addCriteria(req.body.criterias);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

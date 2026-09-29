import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { addBackgroundFile, getBackgroundFiles, removeBackgroundFile } from '../../services/backgrounds.js';
import { runChecklist } from '../middlewares.js';
import { playerBackgroundTypes } from '../../utils/constants.js';

export default function backgroundsController(router: SocketIOApp) {
	router.route(WS_CMD.GET_BACKGROUND_FILES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({ type: z.enum(playerBackgroundTypes) }));
			return await getBackgroundFiles(req.body.type);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_BACKGROUND, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({ 
				type: z.enum(playerBackgroundTypes),
				file: z.object({
					fieldname: z.literal('file'),
					originalname: z.string(),
					encoding: z.string(),
					mimetype: z.string(),
					path: z.string(),
					destination: z.string(),
					filename: z.string(),
					size: z.number().int(),
				}).loose() // Adding loose here to prevent upgrades from the frontend framework to trigger validation errors,
			}));
			return await addBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.REMOVE_BACKGROUND, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({ 
				type: z.enum(playerBackgroundTypes),
				file: z.string(),
			}));
			return await removeBackgroundFile(req.body.type, req.body.file);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

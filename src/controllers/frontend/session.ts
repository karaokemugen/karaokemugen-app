import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	activateSession,
	addSession,
	editSession,
	exportSession,
	getSessions,
	mergeSessions,
	removeSession,
} from '../../services/session.js';
import { runChecklist } from '../middlewares.js';

export default function sessionController(router: SocketIOApp) {
	router.route(WS_CMD.GET_SESSIONS, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await getSessions();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.CREATE_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		// Validate form data
		try {
			check(req.body, z.object({ 
				name: z.string().min(1),
				started_at: z.iso.datetime({ offset: true }).optional(),
				ended_at: z.iso.datetime({ offset: true }).nullish().optional(),
				active: z.boolean().optional(),
				private: z.boolean().optional()
			}));
		
			await addSession(
				req.body.name,
				req.body.started_at?.toString(),
				req.body.ended_at?.toString(),
				req.body.active,
				req.body.private
			);
			return { code: 200, message: APIMessage('SESSION_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.MERGE_SESSIONS, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({
				seid1: z.uuidv4(),
				seid2: z.uuidv4(),
			}));
			const session = await mergeSessions(req.body.seid1, req.body.seid2);
			return { code: 200, message: APIMessage('SESSION_MERGED', { session }) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EDIT_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({ 
				seid: z.uuidv4(),
				name: z.string().optional(),
				started_at: z.iso.datetime({ offset: true }).optional(),
				ended_at: z.iso.datetime({ offset: true }).nullish().optional(),
				active: z.boolean().optional(),
				private: z.boolean().optional()
			}));		
			await editSession(req.body);
			return { code: 200, message: APIMessage('SESSION_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ACTIVATE_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({
				seid: z.uuidv4(),
			}));
			await activateSession(req.body.seid);
			return { code: 200, message: APIMessage('SESSION_ACTIVATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DELETE_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({
				seid: z.uuidv4(),
			}));
			await removeSession(req.body.seid);
			return { code: 200, message: APIMessage('SESSION_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EXPORT_SESSION, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				seid: z.uuidv4(),
			}));
			return await exportSession(req.body.seid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

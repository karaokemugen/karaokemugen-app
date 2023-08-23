import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
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
	router.route('getSessions', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await getSessions();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('createSession', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		// Validate form data
		const validationErrors = check(req.body, {
			name: { presence: { allowEmpty: false } },
		});
		if (!validationErrors) {
			// No errors detected
			try {
				await addSession(
					req.body.name,
					req.body.started_at,
					req.body.ended_at,
					req.body.activate,
					req.body.private
				);
				return { code: 200, message: APIMessage('SESSION_CREATED') };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route('mergeSessions', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			const session = await mergeSessions(req.body.seid1, req.body.seid2);
			return { code: 200, message: APIMessage('SESSION_MERGED', { session }) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('editSession', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		// Validate form data
		const validationErrors = check(req.body, {
			name: { presence: { allowEmpty: false } },
		});
		if (!validationErrors) {
			// No errors detected
			try {
				await editSession({
					seid: req.body.seid,
					name: req.body.name,
					started_at: req.body.started_at,
					ended_at: req.body.ended_at,
					private: req.body.private,
					active: req.body.active,
				});
				return { code: 200, message: APIMessage('SESSION_EDITED') };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route('activateSession', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await activateSession(req.body.seid);
			return { code: 200, message: APIMessage('SESSION_ACTIVATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('deleteSession', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await removeSession(req.body.seid);
			return { code: 200, message: APIMessage('SESSION_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('exportSession', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await exportSession(req.body.seid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

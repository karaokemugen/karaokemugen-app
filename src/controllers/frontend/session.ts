import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
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
		const validationErrors = check(req.body, {
			name: { presence: { allowEmpty: false } },
		});
		if (!validationErrors) {
			// No errors detected
			try {
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
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route(WS_CMD.MERGE_SESSIONS, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			const session = await mergeSessions(req.body.seid1, req.body.seid2);
			return { code: 200, message: APIMessage('SESSION_MERGED', { session }) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EDIT_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		// Validate form data
		const validationErrors = check(req.body, {
			name: { presence: { allowEmpty: false } },
		});
		if (!validationErrors) {
			// No errors detected
			try {
				await editSession(req.body);
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
	router.route(WS_CMD.ACTIVATE_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			await activateSession(req.body.seid);
			return { code: 200, message: APIMessage('SESSION_ACTIVATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DELETE_SESSION, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			await removeSession(req.body.seid);
			return { code: 200, message: APIMessage('SESSION_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EXPORT_SESSION, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await exportSession(req.body.seid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

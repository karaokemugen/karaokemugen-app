
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check, isUUID } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addSession, editSession, exportSession,findSession, getSessions, mergeSessions, removeSession, setActiveSession } from '../../services/session';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function sessionController(router: SocketIOApp) {
	router.route('getSessions', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await getSessions();
		} catch(err) {
			const code = 'SESSION_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('createSession', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		//Validate form data
		const validationErrors = check(req.body, {
			name: {presence: {allowEmpty: false}}
		});
		if (!validationErrors) {
			// No errors detected
			try {
				await addSession(req.body.name, req.body.started_at, req.body.ended_at, req.body.activate, req.body.private);
				return {code: 200, message: APIMessage('SESSION_CREATED')};
			} catch(err) {
				const code = 'SESSION_CREATION_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('mergeSessions', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			seid1: {presence: true, uuidArrayValidator: true},
			seid2: {presence: true, uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				const session = await mergeSessions(req.body.seid1, req.body.seid2);
				return {code: 200, message: APIMessage('SESSION_MERGED', {session: session})};
			} catch(err) {
				const code = 'SESSION_MERGE_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});

	router.route('editSession', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req);
		//Validate form data
		const validationErrors = check(req.body, {
			name: {presence: {allowEmpty: false}}
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
					active: req.body.active
				});
				return {code: 200, message: APIMessage('SESSION_EDITED')};
			} catch(err) {
				const code = 'SESSION_EDIT_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('activateSession', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req);
		try {
			const session = await findSession(req.body.seid);
			setActiveSession(session);
			return {code: 200, message: APIMessage('SESSION_ACTIVATED')};
		} catch(err) {
			return {code: 500, message: APIMessage('SESSION_ACTIVATED_ERROR')};
		}
	});

	router.route('deleteSession', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req);
		try {
			await removeSession(req.body.seid);
			return {code: 200, message: APIMessage('SESSION_DELETED')};
		} catch(err) {
			const code = 'SESSION_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('exportSession', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await exportSession(req.body.seid);
		} catch(err) {
			const code = 'SESSION_EXPORT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}

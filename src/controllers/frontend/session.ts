
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check, isUUID } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addSession, editSession, exportSession,findSession, getSessions, mergeSessions, removeSession, setActiveSession } from '../../services/session';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function sessionController(router: SocketIOApp) {
	router.route('getSessions', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} List karaoke sessions (by date)
 * @apiName getSessions
 * @apiVersion 5.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiSuccess {String} sessions/[]/seid Session UUID
 * @apiSuccess {String} sessions/[]/name Session name
 * @apiSuccess {String} sessions/[]/started_at Session starting date
 * @apiSuccess {Boolean} sessions/[]/private Is session private or public (stats will be sent to KM Server)
 * @apiSuccess {Boolean} sessions/[]/active Is session the current one?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "sessions": [
 * 		{
 *          "active": true,
 * 			"name": "Jonetsu IV Day 1",
 * 			"seid": "..."
 * 			"started_at": "Sat 13 Oct 2019 09:30:00",
 * 			"private": true,
 * 			"ended_at": "Sat 13 Oct 2019 18:00:00"
 * 		},
 * 		...
 * 	]
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_LIST_ERROR"}
 */
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
	/**
 * @api {post} Create karaoke session
 * @apiName createSession
 * @apiVersion 5.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} name Session name
 * @apiParam {String} [date] Optional. Date in ISO format for session. If not provided, session starts now.
 * @apiParam {Boolean} [private] Optional. Is the session private or public ? Default to false.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 OK
 * {code: "SESSION_CREATED"}
 * @apiError SESSION_CREATION_ERROR Error creating session
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_CREATION_ERROR"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Validation error
 */
		await runChecklist(socket, req);
		//Validate form data
		const validationErrors = check(req.body, {
			name: {presence: {allowEmpty: false}}
		});
		if (!validationErrors) {
			// No errors detected
			try {
				await addSession(req.body.name, req.body.started_at, req.body.ended_at, req.body.activate, req.body.private);
				return APIMessage('SESSION_CREATED');
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
	/**
 * @api {post} Merge karaoke sessions
 * @apiName mergeSessions
 * @apiVersion 5.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid1 First Session to merge
 * @apiParam {String} seid2 Second Session to merge
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 OK
 * {code: "SESSION_MERGED"}
 * @apiError SESSION_MER GED_ERROR Error creating session
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_MERGE_ERROR"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Validation error
 */
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			seid1: {uuidArrayValidator: true},
			seid2: {uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				const session = await mergeSessions(req.body.seid1, req.body.seid2);
				return APIMessage('SESSION_MERGED', {session: session});
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
	/**
 * @api {put} Edit session
 * @apiName editSession
 * @apiVersion 4.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiParam {String} name Name of session
 * @apiParam {Date} [ended_at] Session end time
 * @apiParam {boolean} [private] Is session private or public? Private sessions are not uploaded to KM Server
 * @apiParam {boolean} [active] Is session now active?
 * @apiParam {Date} started_at Session start time
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_EDITED"};
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_EDIT_ERROR"}
 */
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
				return APIMessage('SESSION_EDITED');
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
	/**
 * @api {post} Activate session
 * @apiName activateSession
 * @apiVersion 5.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_ACTIVATED"}
 */
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req);
		setActiveSession(await findSession(req.body.seid));
		return APIMessage('SESSION_ACTIVATED');
	});

	router.route('deleteSession', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Delete session
 * @apiName deleteSession
 * @apiVersion 5.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_DELETED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req);
		try {
			await removeSession(req.body.seid);
			return APIMessage('SESSION_DELETED');
		} catch(err) {
			const code = 'SESSION_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('exportSession', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Export session to CSV file
 * @apiName exportSession
 * @apiVersion 5.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_EXPORTED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_EXPORT_ERROR"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		if (!isUUID(req.body.seid)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await exportSession(req.body.seid);
			return APIMessage('SESSION_EXPORTED');
		} catch(err) {
			const code = 'SESSION_EXPORT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}

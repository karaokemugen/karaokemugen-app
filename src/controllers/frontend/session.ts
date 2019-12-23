import { Router } from "express";
import { errMessage } from "../common";
import { requireAdmin, updateUserLoginTime, requireAuth, requireValidUser } from "../middlewares/auth";
import { check } from "../../lib/utils/validators";
import { getSessions, addSession, setActiveSession, mergeSessions, editSession, removeSession, exportSession } from "../../services/session";

export default function sessionController(router: Router) {
	router.route('/sessions')
	/**
 * @api {get} /sessions List karaoke sessions (by date)
 * @apiName GetSessions
 * @apiVersion 3.1.0
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
 * 			"name": "Jonetsu IV Day 1",
 * 			"seid": "..."
 * 			"started_at": "Sat 13 Oct 2019 09:30:00"
 * 		},
 * 		...
 * 	]
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req, res) => {
			try {
				const sessions = await getSessions();
				res.json(sessions);
			} catch(err) {
				errMessage('SESSION_LIST_ERROR',err);
				res.status(500).send('SESSION_LIST_ERROR');
			}
		})
	/**
 * @api {post} /sessions Create karaoke session
 * @apiName CreateSession
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} name Session name
 * @apiParam {String} [date] Optional. Date in ISO format for session. If not provided, session starts now.
 * @apiParam {Boolean} [private] Optional. Is the session private or public ? Default to false.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "SESSION_CREATED"
 * @apiError SESSION_CREATION_ERROR Error creating session
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "SESSION_CREATION_ERROR"
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Validation error
 */
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await addSession(req.body.name, req.body.date, req.body.activate, req.body.private);
					res.status(200).send('SESSION_CREATED');
				} catch(err) {
					errMessage('SESSION_CREATION_ERROR',err);
					res.status(500).send('SESSION_CREATION_ERROR');
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/sessions/merge')
	.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
		const validationErrors = check(req.body, {
			seid1: {uuidArrayValidator: true},
			seid2: {uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				await mergeSessions(req.body.seid1, req.body.seid2);
				res.status(200).send('Sessions merged');
			} catch(err) {
				res.status(500).send(`Error merging sessions : ${err}`);
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			res.status(400).json(validationErrors);
		}
	});
	/**
 * @api {post} /sessions/:seid/activate Activate session
 * @apiName SetSession
 * @apiVersion 3.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
	router.route('/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
		.put(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await editSession(req.params.seid, req.body.name, req.body.started_at, req.body.private);
					res.status(200).send('Session updated');
				} catch(err) {
					res.status(500).send(`Error updating session : ${err}`);
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			setActiveSession(req.params.seid);
			res.status(200).send('Session activated');
		})
		.delete(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				await removeSession(req.params.seid);
				res.status(200).send('Session deleted');
			} catch(err) {
				res.status(500).send(`Error deleting session : ${err}`);
			}
		});
	router.route('/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/export')
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			try {
				await exportSession(req.params.seid);
				res.status(200).send('Session exported');
			} catch(err) {
				res.status(500).send(err);
			}
		});
}

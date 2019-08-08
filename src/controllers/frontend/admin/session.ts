import { Router } from "express";
import { OKMessage, errMessage } from "../../common";
import { requireAdmin, updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { check } from "../../../lib/utils/validators";
import { getSessions, addSession, setActiveSession } from "../../../services/session";

export default function adminSessionController(router: Router) {
	router.route('/admin/sessions')
	/**
 * @api {get} /admin/sessions List karaoke sessions (by date)
 * @apiName GetSessions
 * @apiVersion 3.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiSuccess {String} data/[]/seid Session UUID
 * @apiSuccess {String} data/[]/name Session name
 * @apiSuccess {String} data/[]/started_at Session starting date
 * @apiSuccess {Boolean} data/[]/active Is session the current one?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
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
				res.json(OKMessage(sessions));
			} catch(err) {
				res.status(500).json(errMessage('SESSION_LIST_ERROR',err));
			}
		})
	/**
 * @api {post} /admin/sessions Create karaoke session
 * @apiName CreateSession
 * @apiVersion 3.0.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} name Session name
 * @apiParam {String} [date] Optional. Date in ISO format for session. If not provided, session starts now.
 * @apiSuccess {String} data Session ID of the newly created session
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 * 	"data": "..."
 * 	}
 * }
 * @apiError SESSION_CREATION_ERROR Error creating session
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 * 		"code": "SESSION_CREATION_ERROR",
 * 		"message": "..."
 * }
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
					const seid = await addSession(req.body.name, req.body.date, true);
					res.json(OKMessage(seid,'SESSION_CREATED'));
				} catch(err) {
					res.status(500).json(errMessage('SESSION_CREATION_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/admin/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
	/**
 * @api {post} /admin/sessions/:seid Activate session
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
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			setActiveSession(req.params.seid);
			res.status(200).json();
		});
}

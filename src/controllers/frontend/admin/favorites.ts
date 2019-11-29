import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { emitWS } from "../../../lib/utils/ws";
import { createAutoMix } from "../../../services/favorites";
import { check } from "../../../lib/utils/validators";
import { updateUserLoginTime, requireAdmin, requireValidUser, requireAuth } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";

export default function adminFavoritesController(router: Router) {

	router.route('/admin/automix')
	/**
 * @api {post} /admin/automix Generate a automix playlist
 * @apiName PostMix
 * @apiGroup Favorites
 * @apiVersion 2.1.0
 * @apiPermission admin
 *
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} users Comma-separated list of usernames to pick favorites from
 * @apiParam {Number} duration Duration wished for the generatedplaylist in minutes
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data/playlist_id ID of playlist created
 * @apiSuccess {String} data/playlist_name Name of playlist created
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 201 OK
 * {
 *   "code": "AUTOMIX_CREATED",
 *   "data": {
 *           "playlist_id": 12,
 *           "playlist_name": 'Soirée Kara 07/10/2018'
 *   }
 * }
 * @apiError AUTOMIX_ERROR Unable to create the automix playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "AUTOMIX_ERROR",
 *   "message": "User axel does not exist."
 * }
 */

		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				users: {presence: {allowEmpty: false}},
				duration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					const new_playlist = await createAutoMix({
						duration: +req.body.duration,
						users: req.body.users.split(',')
					}, req.authToken.username);
					emitWS('playlistsUpdated');
					res.status(201).json(OKMessage(new_playlist,'AUTOMIX_CREATED',null));
				} catch(err) {
					res.status(500).json(errMessage('AUTOMIX_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
}
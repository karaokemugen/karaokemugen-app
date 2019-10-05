import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { emitWS } from "../../../lib/utils/ws";
import { addPollVote, getPoll } from "../../../services/poll";
import { check } from "../../../lib/utils/validators";
import { updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";

export default function publicPollController(router: Router) {
	router.route('/public/songpoll')
	/**
 * @api {get} /public/songpoll Get current poll status
 * @apiName GetPoll
 * @apiVersion 2.5.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display

 * @apiSuccess {Array} data/poll Array of `playlistcontents` objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Number} data/poll/index Song's index, used to cast a vote
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccess {Number} data/timeLeft Miliseconds before vote ends
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 * 				 <See admin/playlists/[id]/karas/[plc_id] object>
 *               "votes": 0,
 * 				 "index": 1
 *           },
 *           ...
 *       ],
 * 		 "timeLeft": 25498
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const pollResult = await getPoll(req.authToken, +req.query.from || 0, +req.query.size || 9999999);
				res.json(OKMessage(pollResult));
			} catch(err) {
				res.status(500).json(errMessage(err.code));
			};
		})
	/**
 * @api {post} /public/songpoll Vote in a poll
 * @apiName PostPoll
 * @apiVersion 3.0.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [index] Song's `index` property to vote for
 * @apiSuccess {Array} data/poll Array of `playlistcontents` objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 * 		 "i18n": {
 * 			 "<tag UUID>": {
 * 				"eng": "English version",
 * 				"fre": "Version française"
 * 			 }
 * 			 ...
 * 		 },
 *       "poll": [
 *           {
 * 				<See admin/playlists/[id]/karas/[plc_id] object without i18n in tags>
 *               "votes": 1,
 *           },
 *           ...
 *       ]
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			//Validate form data
			const validationErrors = check(req.body, {
				index: {presence: true, numbersArrayValidator: true}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					const ret = await addPollVote(+req.body.index,req.authToken);
					emitWS('songPollUpdated', ret.data);
					res.json(OKMessage(null,ret.code,ret.data));
				} catch(err) {
					res.status(500).json(errMessage(err.code,err.message));
				}

			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
}
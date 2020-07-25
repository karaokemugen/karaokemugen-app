import { Router } from 'express';

import { check } from '../../lib/utils/validators';
import { addPollVote, getPoll } from '../../services/poll';
import { APIMessage,errMessage } from '../common';
import { requireAuth, requireValidUser,updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';

export default function pollController(router: Router) {
	router.route('/songpoll')
	/**
 * @api {get} /songpoll Get current poll status
 * @apiName GetPoll
 * @apiVersion 3.1.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display

 * @apiSuccess {Array} data/poll Array of `playlistcontents` objects
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Number} data/poll/index Song's index, used to cast a vote
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccess {Number} data/timeLeft Miliseconds before vote ends
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 * 				 <See playlists/[id]/karas/[plc_id] object>
 *               "votes": 0,
 * 				 "index": 1
 *           },
 *           ...
 *       ],
 * 		 "timeLeft": 25498
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_USER_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 425 Too Early
 * {
 *   "code": "POLL_LIST_ERROR"
 * }
 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, (req: any, res: any) => {
			try {
				const pollResult = getPoll(req.authToken, +req.query.from || 0, +req.query.size || 9999999);
				res.json(pollResult);
			} catch(err) {
				errMessage(err.msg);
				res.status(425).json(APIMessage(err.msg));
			}
		})
	/**
 * @api {post} /songpoll Vote in a poll
 * @apiName PostPoll
 * @apiVersion 3.1.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [index] Song's `index` property to vote for
 * @apiSuccess {Array} data/poll Array of `playlistcontents` objects
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
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
 * 				<See playlists/[id]/karas/[plc_id] object without i18n in tags>
 *               "votes": 1,
 *           },
 *           ...
 *       ]
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_USER_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 425
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404
 * @apiErrorExample Error-Response:
 * HTTP/1.1 429
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, (req: any, res: any) => {
			//Validate form data
			const validationErrors = check(req.body, {
				index: {presence: true, numbersArrayValidator: true}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					const ret = addPollVote(+req.body.index,req.authToken);
					res.json(ret.data);
				} catch(err) {
					errMessage(err.msg);
					res.status(err.code || 500).json(APIMessage(err.msg));
				}

			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
}
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addPollVote, getPoll } from '../../services/poll';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function pollController(router: SocketIOApp) {
	router.route('getPoll', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get current poll status
 * @apiName getPoll
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return getPoll(req.token, req.body?.from || 0, req.body?.size || 9999999);
		} catch(err) {
			errMessage(err.msg);
			throw {code: 425, message: APIMessage(err.msg)};
		}
	});
	router.route('votePoll', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Vote in a poll
 * @apiName votePoll
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		//Validate form data
		const validationErrors = check(req.body, {
			index: {presence: true, numbersArrayValidator: true}
		});
		if (!validationErrors) {
			// No errors detected
			try {
				const ret = addPollVote(req.body.index,req.token);
				return ret.data;
			} catch(err) {
				errMessage(err.message);
				throw {code: err?.code || 500, message: APIMessage(err.msg)};
			}

		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
}
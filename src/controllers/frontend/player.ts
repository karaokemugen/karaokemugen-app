import { Router } from 'express';

import { check } from '../../lib/utils/validators';
import { emitWS } from '../../lib/utils/ws';
import { playerMessage, playPlayer, sendCommand } from '../../services/player';
import { getState } from '../../utils/state';
import { APIMessage,errMessage } from '../common';
import { requireAdmin, requireAuth, requireValidUser,updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import { requireWebappLimited } from '../middlewares/webapp_mode';

export default function playerController(router: Router) {
	router.route('/player/play')
	/**
	 * @api {post} /player/play Start a song (classic mode)
	 * @apiName PlayPlayer
	 * @apiVersion 3.1.0
	 * @apiGroup Player
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription User hits play when its his/her turn to sing when classic mode is enabled
	 * Example Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "USER_NOT_ALLOWED_TO_SING"}
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.post(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			if (req.authToken.username === getState().currentRequester) {
				await playPlayer(true);
				res.status(200).json();
			} else {
				res.status(403).json(APIMessage('USER_NOT_ALLOWED_TO_SING'));
			}
		});

	router.route('/player/message')
	/**
 * @api {post} /player/message Send a message to screen or user's devices
 * @apiName PostPlayerMessage
 * @apiVersion 3.1.0
 * @apiGroup Player
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} message Message to display
 * @apiParam {Number} [duration=10000] Duration of message in miliseconds
 * @apiParam {String="users","screen"} [destination="screen"] `users` for user's devices, or `screen` for the screen on which the karaoke is running. Default is `screen`.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data Data sent to the API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "MESSAGE_SENT"}
 * @apiError MESSAGE_SEND_ERROR Message couldn't be sent
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "MESSAGE_SEND_ERROR"}
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				duration: {integerValidator: true},
				message: {presence: true},
				destination: {inclusion: ['screen', 'users', 'all']}
			});
			if (!validationErrors) {
				if (req.body.destination === 'users' || req.body.destination === 'all') emitWS('adminMessage', req.body );
				if (req.body.destination === 'screen' || req.body.destination === 'all') {
					try {
						await playerMessage(req.body.message, +req.body.duration);
					} catch(err) {
						const code = 'MESSAGE_SEND_ERROR';
						errMessage(code, err);
						res.messageFailed = true;
						res.status(500).json(APIMessage(code));
					}
				}
				if (!res.messageFailed) res.status(200).json(APIMessage('MESSAGE_SENT'));
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/player')
		/**
	 * @api {put} /player Send commands to player
	 * @apiName PutPlayerCommando
	 * @apiVersion 3.1.0
	 * @apiGroup Player
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String=play,pause,stopNow,stopAfter,skip,prev,toggleFullscreen,toggleAlwaysOnTop,seek,goTo,mute,unmute,setVolume,showSubs,hideSubs} command Command to send to player
	 * @apiParam {String} [option] Parameter for the command being sent
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {String} args arguments for the message
	 * @apiSuccess {String} data Data returned from API
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 500 Internal Server Error
 	 * {code: "COMMAND_SEND_ERROR"}
	 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				command: {inclusion: [
					'play',
					'pause',
					'stopNow',
					'stopAfter',
					'skip',
					'prev',
					'toggleFullscreen',
					'toggleAlwaysOnTop',
					'setPiPSize',
					'setHwDec',
					'seek',
					'goTo',
					'mute',
					'unmute',
					'setVolume',
					'showSubs',
					'hideSubs'
				]}
			});
			if (!validationErrors) {
				try {
					const code = await sendCommand(req.body.command, req.body.options);
					res.status(200).json(code ? {code}:undefined);
				} catch(err) {
					const code = 'COMMAND_SEND_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
}

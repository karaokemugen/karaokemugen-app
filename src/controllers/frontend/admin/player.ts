import { Router } from "express";
import { OKMessage, errMessage } from "../../common";
import { message } from "../../../player/player";
import { emitWS } from "../../../lib/utils/ws";
import { check } from "../../../lib/utils/validators";
import { requireAdmin, updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { sendCommand } from "../../../services/player";

export default function adminPlayerController(router: Router) {

	router.route('/admin/player/message')
	/**
 * @api {post} /admin/player/message Send a message to screen or user's devices
 * @apiName PostPlayerMessage
 * @apiVersion 2.1.0
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
 * {
 *   "code": "MESSAGE_SENT",
 *   "data": {
 *       "destination": "screen",
 *       "duration": 10000,
 *       "message": "yolo"
 *   }
 * }
 * @apiError MESSAGE_SEND_ERROR Message couldn't be sent
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "MESSAGE_SEND_ERROR"
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				duration: {integerValidator: true},
				message: {presence: true},
				destination: {inclusion: ['screen', 'users', 'all']}
			});
			if (!validationErrors) {
				if (req.body.destination === 'users') emitWS('adminMessage', req.body );
				if (req.body.destination === 'screen') {
					try {
						await message(req.body.message,+req.body.duration);
					} catch(err) {
						res.status(500).json(errMessage('MESSAGE_SEND_ERROR',err));
					}
				}
				if (req.body.destination === 'all') {
					emitWS('adminMessage', req.body );
					try {
						await message(req.body.message,+req.body.duration);
					} catch(err) {
						res.status(500).json(errMessage('MESSAGE_SEND_ERROR',err));
					}
				}
				res.json(OKMessage(req.body,'MESSAGE_SENT',req.body));
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
		router.route('/admin/player')
		/**
	 * @api {put} /admin/player Send commands to player
	 * @apiName PutPlayerCommando
	 * @apiVersion 2.1.0
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
	 * {
	 *   "args": {
	 *       "command": "stopNow"
	 *   },
	 *   "code": "COMMAND_SENT",
	 *   "data": {
	 *       "command": "stopNow"
	 *   }
	 * }
	 */

			.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				const commands = [
					'play',
					'pause',
					'stopNow',
					'stopAfter',
					'skip',
					'prev',
					'toggleFullscreen',
					'toggleAlwaysOnTop',
					'seek',
					'goTo',
					'mute',
					'unmute',
					'setVolume',
					'showSubs',
					'hideSubs'
				];
				const validationErrors = check(req.body, {
					command: {inclusion: commands}
				});
				if (!validationErrors) {
					try {
						await sendCommand(req.body.command,req.body.options);
						res.json(OKMessage(req.body,'COMMAND_SENT',req.body));
					} catch(err) {
						res.status(500).json(errMessage('COMMAND_SEND_ERROR',err));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}
			});
}
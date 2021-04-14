
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { emitWS, SocketIOApp } from '../../lib/utils/ws';
import { initPlayer,isPlayerRunning,playerMessage, playPlayer, sendCommand } from '../../services/player';
import { getState } from '../../utils/state';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function playerController(router: SocketIOApp) {
	router.route('play', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Start a song (classic mode)
	 * @apiName play
	 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.username.toLowerCase() === getState().currentRequester) {
			await playPlayer(true);
			return;
		} else {
			throw {code: 403, message: APIMessage('USER_NOT_ALLOWED_TO_SING')};
		}
	});

	router.route('displayPlayerMessage', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Send a message to screen or user's devices
 * @apiName displayPlayerMessage
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			duration: {integerValidator: true},
			message: {presence: true},
			destination: {inclusion: ['screen', 'users', 'all']}
		});
		if (!validationErrors) {
			const error = null;
			if (req.body.destination === 'users' || req.body.destination === 'all') emitWS('adminMessage', req.body );
			if (req.body.destination === 'screen' || req.body.destination === 'all') {
				try {
					await playerMessage(req.body.message, +req.body.duration, 5);
				} catch(err) {
					error.code = 'MESSAGE_SEND_ERROR';
					error.err = err;
				}
			}
			if (!error) {
				return APIMessage('MESSAGE_SENT');
			} else {
				errMessage(error.code, error.err);
				throw {code: 500, message: APIMessage(error.code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('sendPlayerCommand', async (socket: Socket, req: APIData) => {
		/**
	 * @api {put} Send commands to player
	 * @apiName sendPlayerCommand
	 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		try {
			return await sendCommand(req.body.command, req.body.options);
		} catch(err) {
			const code = 'COMMAND_SEND_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('startPlayer', async (socket: Socket, req: APIData) => {
		/**
	 * @api {post} Start up video player
	 * @apiName startPlayer
	 * @apiVersion 5.0.0
	 * @apiGroup Player
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 409 Conflict
 	 */
	 	await runChecklist(socket, req);
		try {
			if (isPlayerRunning()) {
				throw {code: 409};
			} else {
				await initPlayer();
			}
		} catch(err) {
			throw {code: 500};
		}
	});
}

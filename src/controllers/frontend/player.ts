
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
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.username.toLowerCase() === getState().currentRequester) {
			await playPlayer(true);
			return;
		} else {
			throw {code: 403, message: APIMessage('USER_NOT_ALLOWED_TO_SING')};
		}
	});

	router.route('displayPlayerMessage', async (socket: Socket, req: APIData) => {
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
				return {code: 200, message: APIMessage('MESSAGE_SENT')};
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
		await runChecklist(socket, req);
		try {
			return {code: 200, message: await sendCommand(req.body.command, req.body.options)};
		} catch(err) {
			const code = 'COMMAND_SEND_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code, err)};
		}
	});
	router.route('startPlayer', async (socket: Socket, req: APIData) => {
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

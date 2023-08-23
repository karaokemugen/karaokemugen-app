import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { initPlayer, isPlayerRunning, playerMessage, playPlayer, sendCommand } from '../../services/player.js';
import { runChecklist } from '../middlewares.js';

export default function playerController(router: SocketIOApp) {
	router.route('play', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			await playPlayer(true, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('displayPlayerMessage', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			duration: { integerValidator: true },
			message: { presence: true },
			destination: { inclusion: ['screen', 'users', 'all'] },
		});
		if (!validationErrors) {
			try {
				await playerMessage(req.body.message, +req.body.duration, 5, 'admin', req.body.destination);
				return { code: 200, message: APIMessage('MESSAGE_SENT') };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route('sendPlayerCommand', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			const msg = await sendCommand(req.body.command, req.body.options);
			return { code: 200, message: msg };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('startPlayer', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			if (isPlayerRunning()) {
				throw { code: 409 };
			} else {
				await initPlayer();
			}
		} catch (err) {
			throw { code: 500 };
		}
	});
}

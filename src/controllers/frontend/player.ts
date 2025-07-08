import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { getConfig } from '../../lib/utils/config.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { initPlayer, isPlayerRunning, playerMessage, playPlayer, sendCommand } from '../../services/player.js';
import { runChecklist } from '../middlewares.js';

export default function playerController(router: SocketIOApp) {
	router.route(WS_CMD.PLAY, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			await playPlayer(true, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DISPLAY_PLAYER_MESSAGE, async (socket, req) => {
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
	router.route(WS_CMD.SEND_PLAYER_COMMAND, async (socket, req) => {
		await runChecklist(socket, req, getConfig().Frontend.PublicPlayerControls ? 'guest' : 'admin');
		try {
			const msg = await sendCommand(req.body.command, req.body.options);
			return { code: 200, message: APIMessage(msg) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.START_PLAYER, async (socket, req) => {
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

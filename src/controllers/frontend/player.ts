import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { getConfig } from '../../lib/utils/config.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { initPlayer, isPlayerRunning, playerCommand, playerMessage, playPlayer, sendCommand } from '../../services/player.js';
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
		check(
			req.body,
			z.object({
				duration: z.number().int().min(0).nullish(),
				message: z.string().min(1),
				destination: z.enum(['screen', 'users', 'all']),
			}));
		try {
			await playerMessage(req.body.message, +req.body.duration, 5, 'admin', req.body.destination);
			return { code: 200, message: APIMessage('MESSAGE_SENT') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}		
	});
	router.route(WS_CMD.SEND_PLAYER_COMMAND, async (socket, req) => {
		await runChecklist(socket, req, getConfig().Frontend.PublicPlayerControls ? 'guest' : 'admin');
		try {
			check(req.body, z.object({
				command: z.enum(playerCommand),
				options: z.any().optional(),
			}));
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

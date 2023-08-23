import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { addPollVote, getPoll } from '../../services/poll.js';
import { runChecklist } from '../middlewares.js';

export default function pollController(router: SocketIOApp) {
	router.route('getPoll', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return getPoll(req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('votePoll', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		// Validate form data
		const validationErrors = check(req.body, {
			index: { presence: true, numbersArrayValidator: true },
		});
		if (!validationErrors) {
			// No errors detected
			try {
				const ret = addPollVote(req.body.index, req.token);
				return { code: 200, message: APIMessage(ret.code, ret.data) };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
}

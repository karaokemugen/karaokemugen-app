import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addPollVote, getPoll } from '../../services/poll';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function pollController(router: SocketIOApp) {
	router.route('getPoll', async (socket: Socket, req: APIData) => {	
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return getPoll(req.token);
		} catch(err) {
			errMessage(err.msg);
			throw {code: 425, message: APIMessage(err.msg)};
		}
	});
	router.route('votePoll', async (socket: Socket, req: APIData) => {	
		await runChecklist(socket, req, 'guest', 'limited');
		//Validate form data
		const validationErrors = check(req.body, {
			index: {presence: true, numbersArrayValidator: true}
		});
		if (!validationErrors) {
			// No errors detected
			try {
				const ret = addPollVote(req.body.index,req.token);
				return {code: 200, message: APIMessage(ret.code, ret.data)};
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
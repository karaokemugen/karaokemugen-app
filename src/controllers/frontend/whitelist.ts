
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addKaraToWhitelist, deleteKaraFromWhitelist,emptyWhitelist, getWhitelistContents } from '../../services/whitelist';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function whitelistController(router: SocketIOApp) {
	router.route('emptyWhitelist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		// Empty whitelist
		try {
			return await emptyWhitelist();
		} catch(err) {
			const code = 'WL_EMPTY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getWhitelist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.role === 'admin') {
			try {
				return await getWhitelistContents({
					filter: req.body?.filter,
					lang: req.langs,
					from: +req.body?.from,
					size: +req.body?.size
				});
			} catch(err) {
				const code = 'WL_VIEW_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		}
	});

	router.route('addKaraToWhitelist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			kids: {presence: true, uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				await addKaraToWhitelist(req.body.kids, req.body.reason);
				return {code: 200, message: APIMessage('WL_ADD_SONG')};
			} catch(err) {
				const code = 'WL_ADD_SONG_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}

	});

	router.route('deleteKaraFromWhitelist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			kids: {presence: true, uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await deleteKaraFromWhitelist(req.body.kids);
			} catch(err) {
				const code = 'WL_DELETE_SONG_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}

	});

}

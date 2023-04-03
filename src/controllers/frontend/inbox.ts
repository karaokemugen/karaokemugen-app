import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { deleteKaraInInbox, downloadKaraFromInbox, getInbox } from '../../services/inbox.js';
import { APIMessage, errMessage } from '../common.js';
import { runChecklist } from '../middlewares.js';

export default function inboxController(router: SocketIOApp) {
	router.route('getInbox', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await getInbox(req.body.repoName, req.onlineAuthorization);
		} catch (err) {
			const code = 'INBOX_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('downloadKaraFromInbox', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			await downloadKaraFromInbox(req.body.inid, req.body.repoName, req.onlineAuthorization);
		} catch (err) {
			const code = 'DOWNLOAD_KARA_FROM_INBOX_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteKaraFromInbox', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			return await deleteKaraInInbox(req.body.inid, req.body.repoName, req.onlineAuthorization);
		} catch (err) {
			const code = 'DELETE_KARA_IN_INBOX_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
}

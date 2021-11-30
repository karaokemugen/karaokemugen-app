import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import { deleteKaraInInbox, downloadKaraFromInbox, getInbox } from '../../services/inbox';
import { APIMessage, errMessage } from '../common';
import { runChecklist } from '../middlewares';

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
		} catch(err) {
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

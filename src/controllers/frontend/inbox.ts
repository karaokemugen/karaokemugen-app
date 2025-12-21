import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	changeInboxStatus,
	deleteKaraInInbox,
	downloadKaraFromInbox,
	getInbox,
	markKaraAsUnassignedInInbox,
	removeInboxLocally,
} from '../../services/inbox.js';
import { runChecklist } from '../middlewares.js';

export default function inboxController(router: SocketIOApp) {
	router.route(WS_CMD.GET_INBOX, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await getInbox(req.body.repoName, req.onlineAuthorization);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DOWNLOAD_KARA_FROM_INBOX, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			await downloadKaraFromInbox(req.body.inid, req.body.repoName, req.onlineAuthorization, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CHANGE_INBOX_STATUS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			await changeInboxStatus(
				req.body.inid,
				req.body.repoName,
				req.onlineAuthorization,
				req.body.status,
				req.body.reason
			);
			return { code: 200, message: APIMessage('INBOX_STATUS_UPDATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_KARA_FROM_INBOX, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await deleteKaraInInbox(req.body.inid, req.body.repoName, req.onlineAuthorization);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_KARA_INBOX_LOCALLY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await removeInboxLocally(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.UNASSIGN_KARA_FROM_INBOX, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await markKaraAsUnassignedInInbox(req.body.inid, req.body.repoName, req.onlineAuthorization);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

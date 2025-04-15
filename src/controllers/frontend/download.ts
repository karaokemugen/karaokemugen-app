import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addDownloads,
	getDownloadQueueStatus,
	getDownloads,
	pauseQueue,
	startDownloads,
	wipeDownloads,
} from '../../services/download.js';
import { updateAllMedias } from '../../services/downloadMedias.js';
import { runChecklist } from '../middlewares.js';

export default function downloadController(router: SocketIOApp) {
	router.route(WS_CMD.ADD_DOWNLOADS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const numberOfDLs = await addDownloads(req.body.downloads);
			return APIMessage('DOWNLOADS_QUEUED', numberOfDLs);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_DOWNLOADS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const downloads = await getDownloads();
			return downloads;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_DOWNLOAD_QUEUE_STATUS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return getDownloadQueueStatus();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_DOWNLOADS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await wipeDownloads();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PAUSE_DOWNLOADS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return pauseQueue();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.START_DOWNLOAD_QUEUE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await startDownloads();
			return APIMessage('DOWNLOADS_STARTED');
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.UPDATE_ALL_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		await updateAllMedias(req.body?.repoNames, req.body?.dryRun);
		return APIMessage('UPDATING_MEDIAS_IN_PROGRESS');
	});
}

import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
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
	router.route('addDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const numberOfDLs = await addDownloads(req.body.downloads);
			return APIMessage('DOWNLOADS_QUEUED', numberOfDLs);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const downloads = await getDownloads();
			return downloads;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getDownloadQueueStatus', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return getDownloadQueueStatus();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('deleteDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await wipeDownloads();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('pauseDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return pauseQueue();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('startDownloadQueue', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await startDownloads();
			return APIMessage('DOWNLOADS_STARTED');
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('updateAllMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		await updateAllMedias(req.body?.repoNames, req.body?.dryRun);
		return APIMessage('UPDATING_MEDIAS_IN_PROGRESS');
	});
}

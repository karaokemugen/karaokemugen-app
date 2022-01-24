import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import {
	addDownloads,
	getDownloadQueueStatus,
	getDownloads,
	pauseQueue,
	startDownloads,
	wipeDownloads,
} from '../../services/download';
import { updateAllMedias } from '../../services/downloadMedias';
import { APIMessage, errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function downloadController(router: SocketIOApp) {
	router.route('addDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const numberOfDLs = await addDownloads(req.body.downloads);
			return APIMessage('DOWNLOADS_QUEUED', numberOfDLs);
		} catch (err) {
			const msg = 'DOWNLOADS_QUEUED_ERROR';
			errMessage(err?.msg || msg, err);
			throw { code: err?.code || 500, message: APIMessage(err?.msg || msg) };
		}
	});
	router.route('getDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const downloads = await getDownloads();
			return downloads;
		} catch (err) {
			const code = 'DOWNLOADS_GET_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getDownloadQueueStatus', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return getDownloadQueueStatus();
		} catch (err) {
			throw { code: 500, message: err };
		}
	});
	router.route('deleteDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await wipeDownloads();
		} catch (err) {
			const code = 'DOWNLOADS_WIPE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('pauseDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return pauseQueue();
		} catch (err) {
			const code = 'DOWNLOADS_PAUSE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('startDownloadQueue', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await startDownloads();
			return APIMessage('DOWNLOADS_STARTED');
		} catch (err) {
			const code = 'DOWNLOADS_START_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('updateAllMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		updateAllMedias().catch(() => {});
		return APIMessage('UPDATING_MEDIAS_IN_PROGRESS');
	});
}

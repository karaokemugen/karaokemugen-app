import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import {addDownloads, getDownloads, pauseQueue, startDownloads, wipeDownloads} from '../../services/download';
import { addDownloadBLC, getDownloadBLC, removeDownloadBLC } from '../../services/downloadBLC';
import { cleanAllKaras, downloadAllKaras, downloadRandomSongs, getAllRemoteKaras, getAllRemoteTags, updateAllBases, updateAllKaras, updateAllMedias } from '../../services/downloadUpdater';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function downloadController(router: SocketIOApp) {

	router.route('addDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const numberOfDLs = await addDownloads(req.body.downloads);
			return APIMessage('DOWNLOADS_QUEUED', numberOfDLs);
		} catch(err) {
			const msg = 'DOWNLOADS_QUEUED_ERROR';
			errMessage(err?.msg || msg, err);
			throw {code: err?.code || 500, message: APIMessage(err?.msg || msg)};
		}
	});
	router.route('getDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const downloads = await getDownloads();
			return downloads;
		} catch(err) {
			const code = 'DOWNLOADS_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});	
	router.route('deleteDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await wipeDownloads();
		} catch(err) {
			const code = 'DOWNLOADS_WIPE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('pauseDownloads', async (socket: Socket, req: APIData) => {
	
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await pauseQueue();
		} catch(err) {
			const code = 'DOWNLOADS_PAUSE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addRandomDownloads', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await downloadRandomSongs();
			return APIMessage('DOWNLOADS_STARTED');
		} catch(err) {
			throw APIMessage('DOWNLOADS_START_ERROR', err);
		}
	});
	router.route('startDownloadQueue', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await startDownloads();
			return APIMessage('DOWNLOADS_STARTED');
		} catch(err) {
			const code = 'DOWNLOADS_START_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getDownloadBLCs', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getDownloadBLC();
		} catch(err) {
			const code = 'DOWNLOADS_BLC_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addDownloadBLC', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await addDownloadBLC({ type: req.body.type, value: req.body.value});
		} catch(err) {
			const code = 'DOWNLOADS_BLC_ADDED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deleteDownloadBLC', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await removeDownloadBLC(+req.body.id);
		} catch(err) {
			const code = 'DOWNLOADS_BLC_REMOVE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getRemoteKaras', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getAllRemoteKaras(req.body.repository, {
				filter: req.body.filter,
				q: req.body.q ? req.body.q : '',
				from: +req.body.from || 0,
				size: +req.body.size || 9999999,
			}, req.body.compare);
		} catch(err) {
			const code = 'REMOTE_SONG_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('updateAllBases', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			updateAllKaras();
			return APIMessage('SONGS_UPDATES_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('syncAllBases', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			updateAllBases();
			return APIMessage('BASES_SYNC_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('downloadAllBases', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			downloadAllKaras();
			return APIMessage('DOWNLOAD_SONGS_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('cleanAllBases', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			cleanAllKaras();
			return APIMessage('CLEAN_SONGS_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('updateAllMedias', async (socket: Socket, req: APIData) => {
	
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			updateAllMedias();
			return APIMessage('UPDATING_MEDIAS_IN_PROGRESS');
		} catch(err) {
			// This is async, blabla.
		}
	});
	router.route('getRemoteTags', async (socket: Socket, req: APIData) => {	
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getAllRemoteTags(req.body?.repository, {
				type: +req.body?.type
			});
		} catch(err) {
			const code = 'REMOTE_TAGS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}

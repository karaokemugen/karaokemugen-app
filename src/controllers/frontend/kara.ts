import { Socket } from 'socket.io';

import { previewHooks } from '../../lib/services/karaCreation';
import { APIData } from '../../lib/types/api';
import { check, isUUID } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { getKara, getKaraLyrics, getKaras } from '../../services/kara';
import { createKara, editKara } from '../../services/karaCreation';
import { batchEditKaras, copyKaraToRepo, deleteKara, deleteMediaFile } from '../../services/karaManagement';
import { playSingleSong } from '../../services/karaokeEngine';
import { addKaraToPlaylist } from '../../services/playlist';
import { APIMessage, errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function karaController(router: SocketIOApp) {
	router.route('getKaras', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getKaras({
				filter: req.body?.filter,
				lang: req.langs,
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
				order: req.body?.order,
				q: req.body?.q,
				token: req.token,
				random: req.body?.random,
				blacklist: req.body?.blacklist,
			});
		} catch (err) {
			const code = 'SONG_LIST_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('createKara', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await createKara(req.body);
			return { code: 200, message: APIMessage('KARA_CREATED') };
		} catch (err) {
			const code = 'KARA_CREATED_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('previewHooks', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await previewHooks(req.body);
		} catch (err) {
			const code = 'PREVIEW_HOOKS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getKara', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			if (!isUUID(req.body.kid)) throw { code: 400 };
			return await getKara(req.body?.kid, req.token);
		} catch (err) {
			const code = 'SONG_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteKaras', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		const validationErrors = check(req.body, {
			kids: { presence: true, uuidArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				await deleteKara(req.body.kids);
				return { code: 200, message: APIMessage('KARA_DELETED') };
			} catch (err) {
				const code = 'KARA_DELETED_ERROR';
				errMessage(code, err);
				throw { code: err?.code || 500, message: APIMessage(code) };
			}
		}
	});
	router.route('addKaraToPublicPlaylist', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		// Add Kara to the playlist currently used depending on mode
		if (!isUUID(req.body.kids)) throw { code: 400 };
		try {
			return {
				data: await addKaraToPlaylist(req.body.kids, req.token.username),
				code: 'PL_SONG_ADDED',
			};
		} catch (err) {
			errMessage(err?.code, err?.message);
			throw { code: err?.code || 500, message: APIMessage(err.message, err.msg) };
		}
	});
	router.route('editKara', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editKara(req.body);
			return { code: 200, message: APIMessage('KARA_EDITED') };
		} catch (err) {
			const code = 'KARA_EDITED_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(err?.msg || code) };
		}
	});
	router.route('getKaraLyrics', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		if (!isUUID(req.body.kid)) throw { code: 400 };
		try {
			return await getKaraLyrics(req.body.kid);
		} catch (err) {
			const code = 'LYRICS_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('copyKaraToRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		if (!isUUID(req.body.kid)) throw { code: 400 };
		try {
			await copyKaraToRepo(req.body.kid, req.body.repo);
			return { code: 200, message: APIMessage('SONG_COPIED') };
		} catch (err) {
			const code = 'SONG_COPIED_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('playKara', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await playSingleSong(req.body.kid);
		} catch (err) {
			const code = 'SONG_PLAY_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('editKaras', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			batchEditKaras(req.body.plaid, req.body.action, req.body.tid, req.body.type).catch(() => {});
			return;
		} catch {
			throw { code: 500 };
		}
	});
	router.route('deleteMediaFile', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await deleteMediaFile(req.body.file, req.body.repo);
		} catch (err) {
			const code = 'MEDIA_DELETE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
}

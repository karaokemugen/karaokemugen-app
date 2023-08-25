import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { isUUID } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { getYears } from '../../services/kara.js';
import {
	addTag,
	checkCollections,
	copyTagToRepo,
	editTag,
	getTag,
	getTags,
	mergeTags,
	removeTag,
} from '../../services/tag.js';
import { runChecklist } from '../middlewares.js';

export default function tagsController(router: SocketIOApp) {
	router.route('getTags', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTags(req.body || {});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('addTag', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const tag = await addTag(req.body);
			return { code: 200, message: APIMessage('TAG_CREATED', tag) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('getYears', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getYears();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('mergeTags', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const tag = await mergeTags(req.body.tid1, req.body.tid2);
			return { code: 200, message: APIMessage('TAGS_MERGED', tag) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('deleteTag', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await removeTag(req.body.tids);
			return { code: 200, message: APIMessage('TAG_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('getTag', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.tid)) throw { code: 400 };
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const tag = await getTag(req.body.tid, true);
			return tag;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('editTag', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editTag(req.body.tid, req.body);
			return { code: 200, message: APIMessage('TAG_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('copyTagToRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await copyTagToRepo(req.body.tid, req.body.repo);
			return { code: 200, message: APIMessage('TAG_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('getCollections', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await checkCollections();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

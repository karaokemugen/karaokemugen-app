import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
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
	router.route(WS_CMD.GET_TAGS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTags(req.body || {});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_TAG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const tag = await addTag(req.body);
			return { code: 200, message: APIMessage('TAG_CREATED', tag) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_YEARS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getYears();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.MERGE_TAGS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const tag = await mergeTags(req.body.tid1, req.body.tid2);
			return { code: 200, message: APIMessage('TAGS_MERGED', tag) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DELETE_TAG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await removeTag(req.body.tids);
			return { code: 200, message: APIMessage('TAG_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_TAG, async (socket, req) => {
		if (!isUUID(req.body.tid)) throw { code: 400 };
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const tag = await getTag(req.body.tid);
			return tag;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EDIT_TAG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editTag(req.body.tid, req.body);
			return { code: 200, message: APIMessage('TAG_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.COPY_TAG_TO_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await copyTagToRepo(req.body.tid, req.body.repo);
			return { code: 200, message: APIMessage('TAG_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_COLLECTIONS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await checkCollections();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

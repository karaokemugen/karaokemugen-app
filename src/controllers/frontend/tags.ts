
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { isUUID } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { getYears } from '../../services/kara';
import { addTag, copyTagToRepo, editTag, getTag, getTags, mergeTags,removeTag } from '../../services/tag';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function tagsController(router: SocketIOApp) {

	router.route('getTags', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTags(req.body || {});
		} catch(err) {
			const code = 'TAGS_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addTag', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const tag = await addTag(req.body);
			return {code: 200, message: APIMessage('TAG_CREATED', tag)};
		} catch(err) {
			const code = 'TAG_CREATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getYears', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getYears();
		} catch(err) {
			const code = 'YEARS_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('mergeTags', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.tid1) || !isUUID(req.body.tid2)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const tag = await mergeTags(req.body.tid1, req.body.tid2);
			return {code: 200, message: APIMessage('TAGS_MERGED', tag)};
		} catch(err) {
			const code = 'TAGS_MERGED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('deleteTag', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.tids)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await removeTag(req.body.tids);
			return {code: 200, message: APIMessage('TAG_DELETED')};
		} catch(err) {
			const code = 'TAG_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getTag', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.tid)) throw {code: 400};
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const tag = await getTag(req.body.tid);
			if (!tag) throw {code: 404};
			return tag;
		} catch(err) {
			const code = 'TAG_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('editTag', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.tid)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editTag(req.body.tid, req.body);
			return {code: 200, message: APIMessage('TAG_EDITED')};
		} catch(err) {
			const code = 'TAG_EDIT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('copyTagToRepo', async (socket: Socket, req: APIData) => {
		if (!isUUID(req.body.tid)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await copyTagToRepo(req.body.tid, req.body.repo);
			return {code: 200, message: APIMessage('TAG_COPIED')};
		} catch(err) {
			const code = 'TAG_COPIED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}
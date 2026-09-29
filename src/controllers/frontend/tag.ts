import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { check, isUUID } from '../../lib/utils/validators.js';
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
import { tagTypesNum } from '../../lib/utils/constants.js';

export default function tagsController(router: SocketIOApp) {
	router.route(WS_CMD.GET_TAGS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				type: z.array(z.number().refine(t => tagTypesNum.includes(t))).optional(),
				excludeType: z.boolean().optional(),
				stripEmpty: z.boolean().optional(),
				order: z.enum(['karacount', 'az']).optional(),
				duplicates: z.boolean().optional(),
				tid: z.uuidv4().optional(),
				includeStaging: z.boolean().optional(),
				collections: z.array(z.uuidv4()).optional(),
			}).optional());
			return await getTags(req.body || {});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_TAG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				tid: z.uuidv4().optional(),
				name: z.string(),
				types: z.array(z.number().refine(t => tagTypesNum.includes(t))).optional(),
				short: z.string().nullish(),
				i18n: z.record(z.string(), z.string()).optional(),
				aliases: z.array(z.string()).nullish(),
				tagfile: z.string().optional(),
				repository: z.string(),
				noLiveDownload: z.boolean().optional(),
				priority: z.number().int().optional(),
				karafile_tag: z.string().nullish(),
				description: z.record(z.string(), z.string()).optional(),
				external_database_ids: z.record(z.string(), z.number()).optional(),
			}));
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
			check(req.body, z.object({
				tid1: z.uuidv4(),
				tid2: z.uuidv4(),
			}))
			const tag = await mergeTags(req.body.tid1, req.body.tid2);
			return { code: 200, message: APIMessage('TAGS_MERGED', tag) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DELETE_TAG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				tids: z.array(z.uuidv4()),
			}));
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
			check(req.body, z.object({
				tid: z.uuidv4(),
			}))
			const tag = await getTag(req.body.tid);
			return tag;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EDIT_TAG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				tid: z.uuidv4(),
				name: z.string(),
				types: z.array(z.number().refine(t => tagTypesNum.includes(t))).optional(),
				short: z.string().nullish(),
				i18n: z.record(z.string(), z.string()).optional(),
				aliases: z.array(z.string()).nullish(),
				tagfile: z.string().optional(),
				repository: z.string(),
				noLiveDownload: z.boolean().optional(),
				priority: z.number().int().optional(),
				karafile_tag: z.string().nullish(),
				description: z.record(z.string(), z.string()).optional(),
				external_database_ids: z.record(z.string(), z.number()).optional(),
			}));
			await editTag(req.body.tid, req.body);
			return { code: 200, message: APIMessage('TAG_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.COPY_TAG_TO_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				tid: z.uuidv4(),
				repo: z.string(),
			}));
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

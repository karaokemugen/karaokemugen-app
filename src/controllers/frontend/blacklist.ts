import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { bools } from '../../lib/utils/constants';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addBlacklistCriteria, addSet, copySet, createProblematicBLCSet, deleteBlacklistCriteria, editSet, emptyBlacklistCriterias, exportSet, getAllSets, getBlacklist, getBlacklistCriterias, getSet, importSet,removeSet } from '../../services/blacklist';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function blacklistController(router: SocketIOApp) {
	router.route('emptyBLCSet', async (socket: Socket, req: APIData) => {
		// Empty blacklist criterias
		try {
			await runChecklist(socket, req, 'admin');
			await emptyBlacklistCriterias(req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_EMPTY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code, err)};
		}
	});
	router.route('getBlacklist', async (socket: Socket, req: APIData) => {
		//Get list of blacklisted karas IF the settings allow public to see it
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.role === 'admin') {
			try {
				return await getBlacklist({
					filter: req.body?.filter,
					lang: req.langs,
					from: +req.body?.from || 0,
					size: +req.body?.size || 999999
				});
			} catch(err) {
				const code = 'BL_VIEW_ERROR';
				errMessage(code, err);
				throw {code: 500, message: APIMessage(code)};
			}
		} else {
			throw {code: 403, message: APIMessage('BL_VIEW_FORBIDDEN')};
		}
	});
	router.route('getBLCSet', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.role === 'admin') {
			try {
				return await getBlacklistCriterias(req.body.set_id);
			} catch(err) {
				const code = 'BLC_VIEW_ERROR';
				errMessage(code, err);
				throw {code: 500, message: APIMessage(code)};
			}
		} else {
			throw {code: 403, message: APIMessage('BLC_VIEW_FORBIDDEN')};
		}
	});
	router.route('createBLC', async (socket: Socket, req: APIData) => {
		//Add blacklist criteria
		await runChecklist(socket, req);
		try {
			await addBlacklistCriteria(req.body.blcs, req.body.set_id);
			return {code: 201, message: APIMessage('BLC_CREATED')};
		} catch(err) {
			const code = 'BLC_ADD_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('deleteBLC', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await deleteBlacklistCriteria(req.body.blc_ids, req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getBLCSetInfo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await getSet(req.body.set_id);
		} catch(err) {
			const code = 'BLC_SET_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deleteBLCSet', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await removeSet(req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_SET_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editBLCSet', async (socket: Socket, req: APIData) => {
		// Update BLC Set info
		await runChecklist(socket, req);
		// No errors detected
		if (req.body.name) req.body.name = unescape(req.body.name?.trim());

		try {
			await editSet({
				blc_set_id: req.body.set_id,
				...req.body
			});
			return;
		} catch(err) {
			const code = 'BLC_SET_UPDATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getBLCSets', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest');
		try {
			return await getAllSets();
		} catch(err) {
			const code = 'BLC_SET_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('createBLCSet', async (socket: Socket, req: APIData) => {
		// Add BLC Set
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			name: {presence: {allowEmpty: false}},
			flag_current: {inclusion: bools}
		});
		if (!validationErrors) {
			req.body.name = unescape(req.body.name.trim());

			try {
				const id = await addSet({
					flag_current: req.body.flag_current,
					name: req.body.name,
					created_at: null,
					modified_at: null,
				});
				return {set_id: id};
			} catch(err) {
				const code = 'BLC_SET_CREATE_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('copyBLCs', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await copySet(req.body.fromSet_id, req.body.toSet_id);
			return {code: 200, message: APIMessage('BLC_COPIED')};
		} catch(err) {
			const code = 'BLC_COPY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('exportBLCSet', async (socket: Socket, req: APIData) => {
		// Returns the BLC Set and its contents in an exportable format (to save on disk)
		await runChecklist(socket, req);
		try {
			return await exportSet(req.body.set_id);
		} catch(err) {
			const code = 'BLC_SET_EXPORT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('createProblematicBLCSet', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await createProblematicBLCSet();
		} catch(err) {
			const code = 'BLC_PROBLEMATIC_SET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('importBLCSet', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			blcSet: {isJSON: true}
		});
		if (!validationErrors) {
			try {
				const id = await importSet(req.body.blcSet);
				return {code: 200, message: APIMessage('BLC_SET_IMPORTED', {set_id: id})};
			} catch(err) {
				const code = 'BLC_SET_IMPORT_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code, err)};
			}
		} else {
			// Errors detected
			throw {code: 400, message: validationErrors};
		}
	});
}

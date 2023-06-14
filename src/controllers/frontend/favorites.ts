import { Socket } from 'socket.io';

import { selectFavoritesMicro } from '../../dao/favorites.js';
import { APIData } from '../../lib/types/api.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addToFavorites,
	exportFavorites,
	getFavorites,
	importFavorites,
	removeFavorites,
} from '../../services/favorites.js';
import { APIMessage, errMessage } from '../common.js';
import { runChecklist } from '../middlewares.js';

export default function favoritesController(router: SocketIOApp) {
	router.route('getFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
				return [];
			}
			if (req?.body?.mini) {
				return await selectFavoritesMicro({
					username: req.token.username.toLowerCase(),
					from: +req.body?.from || 0,
					size: +req.body?.size || 9999999,
				});
			}
			return await getFavorites({
				username: req.token.username.toLowerCase(),
				userFavorites: req.token.username.toLowerCase(),
				filter: req.body?.filter,
				lang: req.langs,
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
				order: req.body?.order,
			});
		} catch (err) {
			const code = 'FAVORITES_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('addFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'limited');
		const validationErrors = check(req.body, {
			kids: { presence: true, uuidArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				return await addToFavorites(req.token.username, req.body?.kids, req.onlineAuthorization);
			} catch (err) {
				const code = 'FAVORITES_ADDED_ERROR';
				errMessage(code, err);
				throw { code: err?.code || 500, message: APIMessage(code) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route('deleteFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		// Delete kara from favorites
		// Deletion is through kara ID.
		const validationErrors = check(req.body, {
			kids: { presence: true, uuidArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				return await removeFavorites(req.token.username, req.body?.kids, req.onlineAuthorization);
			} catch (err) {
				const code = 'FAVORITES_DELETED_ERROR';
				errMessage(code, err);
				throw { code: err?.code || 500, message: APIMessage(code) };
			}
		}
	});
	router.route('exportFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		// Returns the playlist and its contents in an exportable format (to save on disk)
		try {
			return await exportFavorites(req.token.username);
		} catch (err) {
			const code = 'FAVORITES_EXPORTED_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('importFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		const validationErrors = check(req.body, {
			favorites: { isJSON: true },
		});
		if (!validationErrors) {
			try {
				const response = await importFavorites(
					req.body?.favorites,
					req.token.username,
					req.onlineAuthorization
				);
				return { code: 200, message: APIMessage('FAVORITES_IMPORTED', response) };
			} catch (err) {
				const code = 'FAVORITES_IMPORTED_ERROR';
				errMessage(code, err);
				throw { code: err?.code || 500, message: APIMessage(code) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
}

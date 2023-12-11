import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addToFavorites,
	exportFavorites,
	getFavorites,
	getFavoritesMicro,
	importFavorites,
	removeFavorites,
} from '../../services/favorites.js';
import { runChecklist } from '../middlewares.js';

export default function favoritesController(router: SocketIOApp) {
	router.route('getFavoritesMicro', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
				return [];
			}
			return await getFavoritesMicro({
				username: req.token.username.toLowerCase(),
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
				return {};
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
			throw { code: err.code || 500, message: APIMessage(err.message) };
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
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route('deleteFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		const validationErrors = check(req.body, {
			kids: { presence: true, uuidArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				return await removeFavorites(req.token.username, req.body?.kids, req.onlineAuthorization);
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		}
	});
	router.route('exportFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		// Returns the playlist and its contents in an exportable format (to save on disk)
		try {
			return await exportFavorites(req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('importFavorites', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		const validationErrors = check(req.body, {
			favorites: { isJSON: true },
		});
		if (!validationErrors) {
			try {
				await importFavorites(req.body?.favorites, req.token.username, req.onlineAuthorization);
				return { code: 200, message: APIMessage('FAVORITES_IMPORTED') };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
}

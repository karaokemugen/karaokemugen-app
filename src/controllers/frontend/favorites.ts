import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
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
import { orderParams } from '../../lib/utils/constants.js';

export default function favoritesController(router: SocketIOApp) {
	router.route(WS_CMD.GET_FAVORITES_MICRO, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
				return [];
			}
			check(req.body, z.object({
				from: z.number().int().min(0).optional(),
				size: z.number().int().min(1).optional()
			}).optional())
			return await getFavoritesMicro({
				username: req.token.username.toLowerCase(),
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_FAVORITES, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
				// TODO: Check if you really want to return an empty object here or if you instead want to return an empty karalist
				return {
					content: [],
					avatars: undefined,
					infos: {
						count: 0,
						from: 0,
						to: 0,
					},
					i18n: undefined,
				};
			}
			check(req.body, z.object({
				from: z.number().int().min(0).optional(),
				size: z.number().int().min(1).optional(),
				filter: z.string().optional(),
				order: z.enum(orderParams).optional(),
			}).optional())
			return await getFavorites({
				username: req.token.username.toLowerCase(),
				favorites: req.token.username.toLowerCase(),
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
	router.route(WS_CMD.ADD_FAVORITES, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'limited');
		try {
			check(req.body, z.object({
				kids: z.array(z.uuidv4())
			}))
			return await addToFavorites(req.token.username, req.body?.kids, req.onlineAuthorization);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}		
	});
	router.route(WS_CMD.DELETE_FAVORITES, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			check(req.body, z.object({ kids: z.array(z.uuidv4()) }));
			return await removeFavorites(req.token.username, req.body?.kids, req.onlineAuthorization);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}		
	});
	router.route(WS_CMD.EXPORT_FAVORITES, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		// Returns the playlist and its contents in an exportable format (to save on disk)
		try {
			return await exportFavorites(req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.IMPORT_FAVORITES, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');		
		try {
			check(req.body, z.object({ favorites: z.object({
				Header: z.object({
					description: z.literal('Karaoke Mugen Favorites List File'),
					version: z.number().int().gte(1)
				}),
				Favorites: z.array(z.object({ kid: z.uuidv4() }).loose())
			})}));
			await importFavorites(req.body?.favorites, req.token.username, req.onlineAuthorization);
			return { code: 200, message: APIMessage('FAVORITES_IMPORTED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}		
	});
}

import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { Role, User } from '../../lib/types/user.js';
import { check, zQParam, zRoles } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { checkSecurityCode, resetSecurityCode } from '../../services/auth.js';
import { getKaras } from '../../services/kara.js';
import { createAdminUser, createUser, editUser, getUser, getUsers, removeUser } from '../../services/user.js';
import {
	convertToRemoteUser,
	getRemoteUsers,
	refreshAnimeList,
	removeRemoteUser,
	resetRemotePassword,
} from '../../services/userOnline.js';
import { runChecklist } from '../middlewares.js';
import { animeListProviders, orderParams, userTypesNum } from '../../lib/utils/constants.js';

export default function userController(router: SocketIOApp) {
	router.route(WS_CMD.GET_USERS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getUsers({
				publicOnly: req.token.role !== 'admin',
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REMOTE_USERS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				instance: z.string(),
				filter: z.string().optional(),
			}));
			return await getRemoteUsers(req.body.filter, req.body.instance
			);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CREATE_USER, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited', { optionalAuth: true });
		try {
			check(req.body,	z.object({
					login: z.string().min(1),
					password: z.string().min(8),
					role: z.enum(['user', 'guest', 'admin']).optional(),
				})
			);
					// Sanitize object and only pass valid options (prevent user.type privilege escalation)
			const userSanitized: User & { role?: Role } = { ...req.body };
			if (req.user?.type !== 0) {
				delete userSanitized.type;
				delete userSanitized.flag_temporary;
			}
			if (userSanitized.role === 'admin' && req.user) {
				await createAdminUser(userSanitized, userSanitized.login.includes('@'), req.user);
			} else {
				await createUser(userSanitized, {
					admin: req.token?.role === 'admin',
					createRemote: userSanitized.login.includes('@'),
				});
			}
			return { code: 200, message: APIMessage('USER_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_USER, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited', { optionalAuth: true });
		try {
			check(req.body, z.object({
				username: z.string(),
			}));
			return await getUser(req.body.username, true, false, req.token?.role || 'guest');
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_USER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({
				username: z.string(),
			}));
			await removeUser(req.body.username);
			return { code: 200, message: APIMessage('USER_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_USER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			// Route mainly used by system panel.
			// If we're modifying a online user (@) only editing its type and flag tutorial is permitted, so we'll filter that out.
			let user;
			check(req.body, z.object({ login: z.string() }));
			if (req.body.login.includes('@')) {
				check(req.body, z.object({
					type: z.coerce.number().refine(t => userTypesNum.includes(t)).optional(),
					flag_tutorial_done: z.boolean().optional(),
					login: z.string(),
				}));
				user = { 
					type: req.body.type, 
					flag_tutorial_done: req.body.flag_tutorial_done, 
					login: req.body.login 
				};
			} else {
				check(req.body, z.object({
					old_login: z.string().optional(),
					login: z.string().optional(),
					// FIXME : Embed this in lib as it's the same checks on KM Server			
					bio: z.string().nullish(),
					email: z.email().or(z.literal('')).nullish(),
					url: z.url().or(z.literal('')).nullish(),
					nickname: z.string().optional(),
					password: z.string().optional(),
					location: z.string().nullish(),
					flag_sendstats: z.coerce.boolean().optional(),
					flag_public: z.coerce.boolean().optional(),
					flag_displayfavorites: z.coerce.boolean().optional(),
					social_networks: z.object({
						mastodon: z.string().optional(),
						instagram: z.string().optional(),
						bluesky: z.string().optional(),
						discord: z.string().optional(),
						twitch: z.string().optional(),
						anilist: z.string().optional(),
						myanimelist: z.string().optional(),
						kitsu: z.coerce.number().int().min(1).or(z.literal('')).nullish(),
						gitlab: z.string().optional(),
					}).loose().nullish(),
					language: z.string().optional(),
					anime_list_to_fetch: z.enum(animeListProviders).nullish(),
					flag_parentsonly: z.coerce.boolean().optional(),
					flag_contributor_emails: z.coerce.boolean().optional(),
					roles: zRoles.optional(),
					type: z.coerce.number().refine(t => userTypesNum.includes(t)).optional(),
					avatar: z.string().optional(),
				}));				
				user = req.body;
			}
			const avatar = req.body.login.includes('@') ? null : req.body.avatar;
			await editUser(req.body.old_login || req.body.login, user, avatar, req.token.role, {
				editRemote: false,
			});
			return { code: 200, message: APIMessage('USER_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.RESET_USER_PASSWORD, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		try {
			check(req.body, z.object({
				username: z.string(),
				password: z.string().optional(),
				securityCode: z.coerce.number().int().min(0).max(999999).optional(),
			}));
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
		if (!req.body.username.includes('@')) {
			try {
				check(req.body, z.object({
					username: z.string(),
					password: z.string(),
				}));
				if (checkSecurityCode(+req.body.securityCode)) {
					await editUser(
						req.body.username,
						{
							login: req.body.username,
							password: req.body.password,
						},
						null,
						'admin'
					);
					resetSecurityCode();
					return { code: 200, message: APIMessage('USER_RESETPASSWORD_SUCCESS') };
				}
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
			throw { code: 403, message: APIMessage('USER_RESETPASSWORD_WRONGSECURITYCODE') };
		} else {
			try {
				check(req.body, z.object({
						username: z.string(),				
				}));
				await resetRemotePassword(req.body.username);
				return { code: 200, message: APIMessage('USER_RESETPASSWORD_ONLINE') };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		}
	});

	router.route(WS_CMD.GET_MY_ACCOUNT, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			return await getUser(req.token.username, true);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DELETE_MY_ACCOUNT, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			await removeUser(req.token.username);
			return { code: 200, message: APIMessage('USER_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.EDIT_MY_ACCOUNT, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');

		try {
			check(req.body, z.object({
				old_login: z.string().optional(),
				login: z.string().optional(),
				// FIXME : Embed this in lib as it's the same checks on KM Server			
				bio: z.string().nullish(),
				email: z.email().or(z.literal('')).nullish(),
				url: z.url().or(z.literal('')).nullish(),
				nickname: z.string().optional(),
				password: z.string().optional(),
				location: z.string().nullish(),
				flag_sendstats: z.coerce.boolean().optional(),
				flag_public: z.coerce.boolean().optional(),
				flag_displayfavorites: z.coerce.boolean().optional(),
				social_networks: z.object({
					mastodon: z.string().nullish(),
					instagram: z.string().nullish(),
					bluesky: z.string().nullish(),
					discord: z.string().nullish(),
					twitch: z.string().nullish(),
					anilist: z.string().nullish(),
					myanimelist: z.string().nullish(),
					kitsu: z.coerce.number().int().min(1).or(z.literal('')).nullish(),
					gitlab: z.string().nullish(),
				}).loose().nullish(),
				language: z.string().optional(),
				anime_list_to_fetch: z.enum(animeListProviders).nullish(),
				flag_parentsonly: z.coerce.boolean().optional(),
				flag_contributor_emails: z.coerce.boolean().optional(),
				roles: zRoles.optional(),
				type: z.number().refine(t => userTypesNum.includes(t)).optional(),
				avatar: z.string().optional(),
			}));
			const response = await editUser(req.token.username, req.body, req.body.avatar || null, req.token.role, {
				editRemote: req.onlineAuthorization,
			});
			return { code: 200, message: APIMessage('USER_EDITED', { onlineToken: response.onlineToken }) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.CONVERT_MY_LOCAL_USER_TO_ONLINE, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			check(req.body,	z.object({
				instance: z.string().min(1),
				password: z.string().min(1),
			}));
			const tokens = await convertToRemoteUser(req.token, req.body.password, req.body.instance);
			return { code: 200, message: APIMessage('USER_CONVERTED', tokens) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.CONVERT_MY_ONLINE_USER_TO_LOCAL, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			check(req.body, z.object({ password: z.string().min(8) }));
			const newToken = await removeRemoteUser(req.token, req.body.password);
			return { code: 200, message: APIMessage('USER_DELETED_ONLINE', newToken) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}		
	});

	router.route(WS_CMD.REFRESH_ANIME_LIST, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			await refreshAnimeList(req.token.username, req.onlineAuthorization);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_ANIME_LIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
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
			// FIXME: This is the same as getKaras so maybe use the same z.object?
			check(req.body, z.object({ 
				filter: z.string().optional(),
				from: z.number().int().min(0).optional(),
				size: z.number().int().min(1).optional(),
				order: z.enum(orderParams).optional(),
				direction: z.enum(['asc', 'desc']).optional(),
				q: zQParam.optional(),
				random: z.number().int().min(1).optional(),
				blacklist: z.boolean().optional(),
				parentsOnly: z.boolean().optional(),
				ignoreCollections: z.boolean().optional(),
			}).optional());
			return await getKaras({
				username: req.token.username.toLowerCase(),
				userAnimeList: req.token.username.toLowerCase(),
				filter: req.body?.filter,
				lang: req.langs,
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
				order: req.body?.order,
				direction: req.body?.direction,
				q: req.body?.q,
				parentsOnly: req.body?.parentsOnly,
				blacklist: req.body?.blacklist,
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}

import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { Role, User } from '../../lib/types/user.js';
import { check, zNonEmptyString } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { resetSecurityCode } from '../../services/auth.js';
import { getKaras } from '../../services/kara.js';
import { createAdminUser, createUser, editUser, getUser, getUsers, removeUser } from '../../services/user.js';
import {
	convertToRemoteUser,
	getRemoteUsers,
	refreshAnimeList,
	removeRemoteUser,
	resetRemotePassword,
} from '../../services/userOnline.js';
import { getState } from '../../utils/state.js';
import { runChecklist } from '../middlewares.js';

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
			return await getRemoteUsers(req.body.filter, req.body.instance
			);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CREATE_USER, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited', { optionalAuth: true });
		// Validate form data
		const validationErrors = check(
			req.body,
			z.object({
				login: zNonEmptyString,
				password: zNonEmptyString,
				role: z.enum(['user', 'guest', 'admin']).optional(),
			})
		);
		if (!validationErrors) {
			// No errors detected

			// Sanitize object and only pass valid options (prevent user.type privilege escalation)
			const userSanitized: User & { role?: Role } = { ...req.body };
			if (req.user?.type !== 0) {
				delete userSanitized.type;
				delete userSanitized.flag_temporary;
			}

			try {
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
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});

	router.route(WS_CMD.GET_USER, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited', { optionalAuth: true });
		try {
			return await getUser(req.body.username, true, false, req.token?.role || 'guest');
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_USER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			await removeUser(req.body.username);
			return { code: 200, message: APIMessage('USER_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_USER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			// If we're modifying a online user (@) only editing its type is permitted, so we'll filter that out.
			const user = req.body.login.includes('@')
				? { type: req.body.type, flag_tutorial_done: req.body.flag_tutorial_done, login: req.body.login }
				: req.body;
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
		if (!req.body.username.includes('@')) {
			if (+req.body.securityCode === getState().securityCode) {
				try {
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
				} catch (err) {
					throw { code: err.code || 500, message: APIMessage(err.message) };
				}
			} else {
				throw { code: 403, message: APIMessage('USER_RESETPASSWORD_WRONGSECURITYCODE') };
			}
		} else {
			try {
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
		const validationErrors = check(
			req.body,
			z.object({
				instance: zNonEmptyString,
				password: zNonEmptyString,
			})
		);
		if (!validationErrors) {
			// No errors detected
			try {
				const tokens = await convertToRemoteUser(req.token, req.body.password, req.body.instance);
				return { code: 200, message: APIMessage('USER_CONVERTED', tokens) };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});

	router.route(WS_CMD.CONVERT_MY_ONLINE_USER_TO_LOCAL, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		const validationErrors = check(req.body, z.object({ password: zNonEmptyString }));
		if (!validationErrors) {
			// No errors detected
			try {
				const newToken = await removeRemoteUser(req.token, req.body.password);
				return { code: 200, message: APIMessage('USER_DELETED_ONLINE', newToken) };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
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

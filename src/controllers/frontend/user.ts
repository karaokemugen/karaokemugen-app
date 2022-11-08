import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { resetSecurityCode } from '../../services/auth';
import { getKaras } from '../../services/kara';
import { createAdminUser, createUser, editUser, getUser, getUsers, removeUser } from '../../services/user';
import {
	convertToRemoteUser,
	refreshAnimeList,
	removeRemoteUser,
	resetRemotePassword,
} from '../../services/userOnline';
import { getState } from '../../utils/state';
import { APIMessage, errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function userController(router: SocketIOApp) {
	router.route('getUsers', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			if (req.token.role === 'admin') {
				return await getUsers();
			}
			const users = await getUsers();
			return users.filter(x => x.flag_public);
		} catch (err) {
			const code = 'USER_LIST_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('createUser', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited', { optionalAuth: true });
		// Validate form data
		const validationErrors = check(req.body, {
			login: { presence: { allowEmpty: false } },
			password: { presence: { allowEmpty: false } },
			role: { inclusion: ['user', 'admin'] },
		});
		if (!validationErrors) {
			// No errors detected
			if (req.body.login) req.body.login = unescape(req.body.login.trim());
			if (req.body.role) req.body.role = unescape(req.body.role);
			if (req.body.password) req.body.password = unescape(req.body.password);
			try {
				if (req.body.role === 'admin' && req.user) {
					await createAdminUser(req.body, req.body.login.includes('@'), req.user);
				} else {
					await createUser(req.body, { createRemote: req.body.login.includes('@') });
				}
				return { code: 200, message: APIMessage('USER_CREATED') };
			} catch (err) {
				errMessage(err.msg, err.details);
				throw { code: err?.code || 500, message: APIMessage(err?.msg) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});

	router.route('getUser', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const userdata = await getUser(req.body.username, true);
			delete userdata.password;
			if (!userdata.flag_public && req.token.role !== 'admin') throw { code: 403 };
			if (!userdata) throw { code: 404 };
			return userdata;
		} catch (err) {
			const code = 'USER_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteUser', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			await removeUser(req.body.username);
			return { code: 200, message: APIMessage('USER_DELETED') };
		} catch (err) {
			errMessage(err.msg, err.details);
			throw { code: err?.code || 500, message: APIMessage(err.msg, err.details) };
		}
	});
	router.route('editUser', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			// If we're modifying a online user (@) only editing its type is permitted, so we'll filter that out.
			const user = req.body.login.includes('@')
				? { type: req.body.type, flag_tutorial_done: req.body.flag_tutorial_done }
				: req.body;
			const avatar = req.body.login.includes('@') ? null : req.body.avatar;
			const login = req.body.old_login ? req.body.old_login : req.body.login;
			await editUser(login, user, avatar, req.token.role, { editRemote: false });
			return { code: 200, message: APIMessage('USER_EDITED') };
		} catch (err) {
			const code = 'USER_EDIT_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(err.msg, err.details) };
		}
	});

	router.route('resetUserPassword', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		if (!req.body.username.includes('@')) {
			if (+req.body.securityCode === getState().securityCode) {
				try {
					await editUser(
						req.body.username,
						{
							password: req.body.password,
						},
						null,
						'admin'
					);
					resetSecurityCode();
					return { code: 200, message: APIMessage('USER_RESETPASSWORD_SUCCESS') };
				} catch (err) {
					const code = 'USER_RESETPASSWORD_ERROR';
					errMessage(code, err);
					throw { code: err?.code || 500, message: APIMessage(code) };
				}
			} else {
				throw { code: 403, message: APIMessage('USER_RESETPASSWORD_WRONGSECURITYCODE') };
			}
		} else {
			try {
				await resetRemotePassword(req.body.username);
				return { code: 200, message: APIMessage('USER_RESETPASSWORD_ONLINE') };
			} catch (err) {
				const code = 'USER_RESETPASSWORD_ONLINE_ERROR';
				errMessage(code, err);
				throw { code: err?.code || 500, message: APIMessage(code) };
			}
		}
	});

	router.route('getMyAccount', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			const user = await getUser(req.token.username, true);
			delete user.password;
			return user;
		} catch (err) {
			const code = 'USER_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('deleteMyAccount', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			await removeUser(req.token.username);
			return { code: 200, message: APIMessage('USER_DELETED') };
		} catch (err) {
			const code = 'USER_DELETE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('editMyAccount', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');

		if (req.body.bio) req.body.bio = unescape(req.body.bio.trim());
		if (req.body.email) req.body.email = unescape(req.body.email.trim());
		if (req.body.url) req.body.url = unescape(req.body.url.trim());
		if (req.body.nickname) req.body.nickname = unescape(req.body.nickname.trim());
		try {
			const response = await editUser(req.token.username, req.body, req.body.avatar || null, req.token.role, {
				editRemote: req.onlineAuthorization,
			});
			return { code: 200, message: APIMessage('USER_EDITED', { onlineToken: response.onlineToken }) };
		} catch (err) {
			errMessage(err.msg, err);
			throw { code: err?.code || 500, message: APIMessage(err?.msg) };
		}
	});

	router.route('convertMyLocalUserToOnline', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		const validationErrors = check(req.body, {
			instance: { presence: true },
			password: { presence: true },
		});
		if (!validationErrors) {
			// No errors detected
			req.body.instance = unescape(req.body.instance.trim());
			try {
				const tokens = await convertToRemoteUser(req.token, req.body.password, req.body.instance);
				return { code: 200, message: APIMessage('USER_CONVERTED', tokens) };
			} catch (err) {
				errMessage(err.msg, err);
				throw { code: err?.code || 500, message: APIMessage(err.msg) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});

	router.route('convertMyOnlineUserToLocal', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		const validationErrors = check(req.body, {
			password: { presence: true },
		});
		if (!validationErrors) {
			// No errors detected
			try {
				const newToken = await removeRemoteUser(req.token, req.body.password);
				return { code: 200, message: APIMessage('USER_DELETED_ONLINE', newToken) };
			} catch (err) {
				const code = 'USER_DELETE_ERROR_ONLINE';
				errMessage(code, err);
				throw { code: err?.code || 500, message: APIMessage(code) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});

	router.route('refreshAnimeList', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			await refreshAnimeList(req.token.username, req.onlineAuthorization);
		} catch (err) {
			const code = 'REFRESH_ANIME_LIST_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('getAnimeList', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			if (req.token.role === 'guest') {
				return [];
			}
			return await getKaras({
				username: req.token.username.toLowerCase(),
				userAnimeList: req.token.username.toLowerCase(),
				filter: req.body?.filter,
				lang: req.langs,
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
				order: req.body?.order,
				parentsOnly: req.body?.parentsOnly,
				blacklist: req.body?.blacklist,
			});
		} catch (err) {
			const code = 'ANIME_LIST_VIEW_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
}

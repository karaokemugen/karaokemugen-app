import i18next from 'i18next';
import { Dispatch } from 'react';

import { OldJWTToken, OldTokenResponse } from '../../../../src/lib/types/user';
import { commandBackend, setAuthorization } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';
import { AuthAction, IAuthentifactionInformation, LoginFailure, LoginSuccess, LogoutUser } from '../types/auth';
import { PlaylistInfo } from '../types/frontendContext';
import { SettingsFailure, SettingsSuccess } from '../types/settings';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from './frontendContext';
import { setSettings } from './settings';
import { WS_CMD } from '../../utils/ws';

export async function login(
	username: string,
	password: string,
	dispatch: Dispatch<LoginSuccess | LoginFailure | SettingsSuccess | SettingsFailure | PlaylistInfo>,
	securityCode?: number,
	guestName?: string
): Promise<string> {
	try {
		const info: IAuthentifactionInformation = await commandBackend(username ? WS_CMD.LOGIN : WS_CMD.LOGIN_GUEST, {
			username,
			password,
			securityCode,
			name: guestName,
		});

		// Store data, should be managed in a service and item should be enum and not string
		localStorage.setItem('kmToken', info.token);
		info.onlineToken
			? localStorage.setItem('kmOnlineToken', info.onlineToken)
			: localStorage.removeItem('kmOnlineToken');
		setAuthorization(info.token, info.onlineToken);
		displayMessage('info', i18next.t('LOG_SUCCESS', { name: info.username }));
		setPlaylistInfoLeft(dispatch);
		setPlaylistInfoRight(dispatch);
		dispatch({
			type: AuthAction.LOGIN_SUCCESS,
			payload: info,
		});
		await setSettings(dispatch);
		return info.role;
	} catch (error: any) {
		dispatch({
			type: AuthAction.LOGIN_FAILURE,
			payload: {
				error: error?.message ? error?.message : error?.toString(),
			},
		});
		throw error;
	}
}

export async function logout(dispatch: Dispatch<LogoutUser | SettingsSuccess | SettingsFailure>): Promise<void> {
	localStorage.removeItem('kmToken');
	localStorage.removeItem('kmOnlineToken');
	setAuthorization(null, null);

	dispatch({
		type: AuthAction.LOGOUT_USER,
	});
	await setSettings(dispatch, true);
}

export function setAuthenticationInformation(
	dispatch: Dispatch<LoginSuccess | SettingsSuccess | SettingsFailure>,
	data: IAuthentifactionInformation
) {
	// Store data, should be managed in a service and item should be enum and not string
	localStorage.setItem('kmToken', data.token);
	data.onlineToken
		? localStorage.setItem('kmOnlineToken', data.onlineToken)
		: localStorage.removeItem('kmOnlineToken');
	setAuthorization(data.token, data.onlineToken);

	dispatch({
		type: AuthAction.LOGIN_SUCCESS,
		payload: {
			username: data.username,
			role: data.role,
			token: data.token,
			onlineToken: data.onlineToken,
		},
	});
	setSettings(dispatch);
}

export async function isAlreadyLogged(
	dispatch: Dispatch<LoginSuccess | LoginFailure | SettingsSuccess | SettingsFailure | LogoutUser | PlaylistInfo>
) {
	const kmToken = localStorage.getItem('kmToken');
	const kmOnlineToken = localStorage.getItem('kmOnlineToken');
	setAuthorization(kmToken, kmOnlineToken);

	if (kmToken) {
		try {
			const verification = await commandBackend(WS_CMD.CHECK_AUTH, undefined, false, 30000);
			setPlaylistInfoLeft(dispatch);
			setPlaylistInfoRight(dispatch);
			dispatch({
				type: AuthAction.LOGIN_SUCCESS,
				payload: {
					username: verification.username,
					role: verification.role,
					token: kmToken,
					onlineToken: kmOnlineToken,
					onlineAvailable: verification.onlineAvailable,
				},
			});
			await setSettings(dispatch);
		} catch (error: any) {
			logout(dispatch);
			dispatch({
				type: AuthAction.LOGIN_FAILURE,
				payload: {
					error: error,
				},
			});
			await setSettings(dispatch, true);
		}
	} else {
		await setSettings(dispatch, true);
	}
}

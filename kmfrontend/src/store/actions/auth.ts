import i18next from 'i18next';
import { Dispatch } from 'react';

import { Token } from '../../../../src/lib/types/user';
import { commandBackend, setAuthorization } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';
import { AuthAction, IAuthentifactionInformation, LoginFailure, LoginSuccess, LogoutUser } from '../types/auth';
import { PlaylistInfo } from '../types/frontendContext';
import { SettingsFailure, SettingsSuccess } from '../types/settings';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from './frontendContext';
import { setSettings } from './settings';

export async function login(
	username: string,
	password: string,
	dispatch: Dispatch<LoginSuccess | LoginFailure | SettingsSuccess | SettingsFailure | PlaylistInfo>,
	securityCode?: number
): Promise<string> {
	try {
		const info: IAuthentifactionInformation = await commandBackend(username ? 'login' : 'loginGuest', {
			username,
			password,
			securityCode
		});

		// Store data, should be managed in a service and item should be enum and not string
		localStorage.setItem('kmToken', info.token);
		localStorage.setItem('kmOnlineToken', info.onlineToken);
		setAuthorization(info.token, info.onlineToken);
		displayMessage('info', i18next.t('LOG_SUCCESS', { name: info.username }));
		setPlaylistInfoLeft(dispatch);
		setPlaylistInfoRight(dispatch);
		dispatch({
			type: AuthAction.LOGIN_SUCCESS,
			payload: info
		});
		await setSettings(dispatch);
		return info.role;
	} catch (error: any) {
		dispatch({
			type: AuthAction.LOGIN_FAILURE,
			payload: {
				error: error?.message ? error?.message : error?.toString()
			}
		});
		throw error;
	}
}

export function logout(dispatch: Dispatch<LogoutUser>): void {
	localStorage.removeItem('kmToken');
	localStorage.removeItem('kmOnlineToken');
	setAuthorization(null, null);

	dispatch({
		type: AuthAction.LOGOUT_USER
	});
}

export function setAuthentifactionInformation(dispatch: Dispatch<LoginSuccess | SettingsSuccess | SettingsFailure>, data: IAuthentifactionInformation) {
	// Store data, should be managed in a service and item should be enum and not string
	localStorage.setItem('kmToken', data.token);
	localStorage.setItem('kmOnlineToken', data.onlineToken);
	setAuthorization(data.token, data.onlineToken);

	dispatch({
		type: AuthAction.LOGIN_SUCCESS,
		payload: {
			username: data.username,
			role: data.role,
			token: data.token,
			onlineToken: data.onlineToken
		}
	});
	setSettings(dispatch);
}

export async function isAlreadyLogged(dispatch: Dispatch<LoginSuccess | LoginFailure | SettingsSuccess | SettingsFailure | LogoutUser | PlaylistInfo>) {
	const kmToken = localStorage.getItem('kmToken');
	const kmOnlineToken = localStorage.getItem('kmOnlineToken');
	setAuthorization(kmToken, kmOnlineToken);

	if (kmToken) {
		try {
			const verification: Token = await commandBackend('checkAuth', undefined, false, 30000);
			setPlaylistInfoLeft(dispatch);
			setPlaylistInfoRight(dispatch);
			dispatch({
				type: AuthAction.LOGIN_SUCCESS,
				payload: {
					username: verification.username,
					role: verification.role,
					token: kmToken,
					onlineToken: kmOnlineToken,
					onlineAvailable: verification.onlineAvailable
				}
			});
			await setSettings(dispatch);
		} catch (error: any) {
			logout(dispatch);
			dispatch({
				type: AuthAction.LOGIN_FAILURE,
				payload: {
					error: error
				}
			});
			await setSettings(dispatch, true);
		}
	} else {
		await setSettings(dispatch, true);
	}
}

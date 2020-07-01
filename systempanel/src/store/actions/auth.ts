import Axios from 'axios';
import i18next from 'i18next';
import { Dispatch } from 'react';

import { AuthAction, IAuthenticationVerification,IAuthentifactionInformation, LoginFailure, LoginSuccess, LogoutUser } from '../types/auth';
import { SettingsFailure,SettingsSuccess } from '../types/settings';
import { setSettings } from './settings';

export async function login(username: string, password: string, dispatch: Dispatch<LoginSuccess | LoginFailure | SettingsSuccess | SettingsFailure>): Promise<void> {
	try {
		const info: IAuthentifactionInformation = (await Axios.post('/auth/login', {
			username,
			password
		})).data;

		if (info.role !== 'admin') {
			throw i18next.t('ERROR_CODES.ADMIN_PLEASE');
		}

		// Store data, should be managed in a service and item should be enum and not string
		localStorage.setItem('kmToken', info.token);
		localStorage.setItem('kmOnlineToken', info.onlineToken);
		Axios.defaults.headers.common['authorization'] = info.token;
		Axios.defaults.headers.common['onlineAuthorization'] = info.onlineToken;

		dispatch({
			type: AuthAction.LOGIN_SUCCESS,
			payload: info
		});
		await setSettings(dispatch);
	} catch (error) {
		dispatch({
			type: AuthAction.LOGIN_FAILURE,
			payload: {
				error: error
			}
		});
		throw error;
	}
}

export function logout(dispatch: Dispatch<LogoutUser>): void {
	localStorage.removeItem('kmToken');
	localStorage.removeItem('kmOnlineToken');
	delete Axios.defaults.headers.common['authorization'];
	delete Axios.defaults.headers.common['onlineAuthorization'];

	dispatch({
		type: AuthAction.LOGOUT_USER
	});
}

export async function isAlreadyLogged(dispatch: Dispatch<LoginSuccess | LoginFailure | SettingsSuccess | SettingsFailure>) {
	const kmToken = localStorage.getItem('kmToken');
	const kmOnlineToken = localStorage.getItem('kmOnlineToken');

	Axios.defaults.headers.common['authorization'] = kmToken;
	Axios.defaults.headers.common['onlineAuthorization'] = kmOnlineToken;

	try {
		const verification: IAuthenticationVerification = (await Axios.get('/auth/checkauth')).data;
		dispatch({
			type: AuthAction.LOGIN_SUCCESS,
			payload: {
				username: verification.username,
				role: verification.role,
				token: kmToken,
				onlineToken: kmOnlineToken
			}
		});
		await setSettings(dispatch);
	} catch (error) {
		dispatch({
			type: AuthAction.LOGIN_FAILURE,
			payload: {
				error: error
			}
		});
	}
}

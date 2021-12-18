import * as Sentry from '@sentry/react';
import i18next from 'i18next';
import { Dispatch } from 'react';

import { User } from '../../../../src/lib/types/user';
import { Config } from '../../../../src/types/config';
import { Version } from '../../../../src/types/state';
import { langSupport } from '../../utils/isoLanguages';
import { commandBackend } from '../../utils/socket';
import { LogoutUser } from '../types/auth';
import { Settings, SettingsFailure, SettingsSuccess } from '../types/settings';
import { logout } from './auth';

export async function setSettings(
	dispatch: Dispatch<SettingsSuccess | SettingsFailure>,
	withoutProfile?: boolean,
	tryAgain = false
): Promise<void> {
	try {
		const res = await commandBackend('getSettings');
		if (!withoutProfile) {
			try {
				const user: User = await commandBackend('getMyAccount');
				const favorites = await commandBackend('getFavorites', { mini: true });
				const favoritesSet = new Set<string>();
				for (const kara of favorites) {
					favoritesSet.add(kara.kid);
				}
				i18next.changeLanguage(user.language ? user.language : langSupport);
				if (!res.state.sentrytest) setSentry(res.state.environment, res.version, res.config, user);
				dispatch({
					type: Settings.SETTINGS_SUCCESS,
					payload: {
						state: res.state,
						config: res.config,
						user: user,
						favorites: favoritesSet,
						version: res.version,
					},
				});
			} catch (e) {
				logout(dispatch as unknown as Dispatch<LogoutUser>);
			}
		} else {
			i18next.changeLanguage(langSupport);
			dispatch({
				type: Settings.SETTINGS_SUCCESS,
				payload: { state: res.state, config: res.config, user: {}, favorites: new Set(), version: res.version },
			});
		}
	} catch (error: any) {
		dispatch({
			type: Settings.SETTINGS_FAILURE,
			payload: {
				error: error,
			},
		});
		if (tryAgain) {
			throw error;
		} else {
			return setSettings(dispatch, withoutProfile, true);
		}
	}
}

function setSentry(environment: string, version: Version, config: Config, user: User) {
	if (config.Online?.ErrorTracking) {
		Sentry.init({
			dsn: 'https://464814b9419a4880a2197b1df7e1d0ed@o399537.ingest.sentry.io/5256806',
			environment: environment || 'release',
			release: version.number,
			ignoreErrors: [
				'Network Error',
				'Request failed with status code',
				'Request aborted',
				'ResizeObserver loop limit exceeded',
				/.*[n|N]o space left on device.*/,
			],
		});
		Sentry.configureScope(scope => {
			scope.setUser({
				username: user?.login,
			});
		});
		if (version.sha)
			Sentry.configureScope(scope => {
				scope.setTag('commit', version.sha as string);
			});
	}
}

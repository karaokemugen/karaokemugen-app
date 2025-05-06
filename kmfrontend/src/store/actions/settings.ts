import * as Sentry from '@sentry/react';
import i18next from 'i18next';
import { Dispatch } from 'react';

import { User } from '../../../../src/lib/types/user';
import { Config } from '../../../../src/types/config';
import { PublicState, Version } from '../../../../src/types/state';
import { langSupport } from '../../utils/isoLanguages';
import { commandBackend } from '../../utils/socket';
import { LogoutUser } from '../types/auth';
import { Settings, SettingsFailure, SettingsSuccess } from '../types/settings';
import { logout } from './auth';
import 'dayjs/locale/de';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/id';
import 'dayjs/locale/it';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/ta';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

export async function setSettings(
	dispatch: Dispatch<SettingsSuccess | SettingsFailure>,
	withoutProfile?: boolean,
	tryAgain = false
): Promise<void> {
	try {
		const res: {
			version: Version;
			config: Config;
			state: PublicState;
		} = await commandBackend('getSettings');
		dayjs.extend(localizedFormat);
		dayjs.extend(relativeTime);
		if (!withoutProfile) {
			try {
				if (!res.config.System) {
					res.config.System = { Repositories: await commandBackend('getRepos') } as Config['System'];
				}
				const user: User = await commandBackend('getMyAccount');
				const favorites = await commandBackend('getFavoritesMicro');
				const favoritesSet = new Set<string>();
				for (const kara of favorites) {
					favoritesSet.add(kara.kid);
				}
				const newLanguage = user.language && user.type < 2 ? user.language : langSupport;
				i18next.changeLanguage(newLanguage);
				dayjs.locale(newLanguage);
				if (!user.language && user.type < 2) {
					user.language = langSupport;
					try {
						await commandBackend('editMyAccount', user);
					} catch (_) {
						// already display
					}
				}
				setSentry(res.state, res.version, res.config, user);
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
			} catch (_) {
				logout(dispatch as unknown as Dispatch<SettingsSuccess | SettingsFailure | LogoutUser>);
			}
		} else {
			i18next.changeLanguage(langSupport);
			dayjs.locale(langSupport);
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

function setSentry(state: PublicState, version: Version, config: Config, user: User) {
	if (!state.sentrytest && config.Online?.ErrorTracking) {
		Sentry.init({
			dsn: state.sentrydsn,
			environment: state.environment || 'release',
			release: version.number,
			ignoreErrors: [
				'Network Error',
				'Request failed with status code',
				'Request aborted',
				'ResizeObserver loop limit exceeded',
				'ResizeObserver loop completed with undelivered notifications',
				/.*[n|N]o space left on device.*/,
				'PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED',
				'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED',
				'DELETE_PLAYLIST_ERROR_CURRENT',
				'DELETE_PLAYLIST_ERROR_PUBLIC',
				'DELETE_PLAYLIST_ERROR_WHITELIST',
				'DELETE_PLAYLIST_ERROR_BLACKLIST',
			],
		});
		Sentry.getCurrentScope().setUser({ username: user?.login });
		if (version.sha) Sentry.getCurrentScope().setTag('commit', version.sha as string);
	}
}

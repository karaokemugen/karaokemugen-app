import Axios from 'axios';
import { Dispatch } from 'react';
import { SettingsSuccess, SettingsFailure, Settings } from '../types/settings';
import { State } from '../../../../src/types/state';
import { Config } from '../../../../src/types/config';
import * as Sentry from '@sentry/browser';
import { User } from '../../../../src/lib/types/user';

export async function setSettings(dispatch: Dispatch<SettingsSuccess | SettingsFailure>): Promise<void> {
	try {
		const res = await Axios.get('/settings');
		const user = await Axios.get('/myaccount/');

		if (!res.data.state.sentrytest) setSentry(res.data.state, res.data.config, user.data);

		dispatch({
			type: Settings.SETTINGS_SUCCESS,
			payload: { state: res.data.state, config: res.data.config, user: user.data }
		});
	} catch (error) {
		dispatch({
			type: Settings.SETTINGS_FAILURE,
			payload: {
				error: error
			}
		});
		throw error;
	}
}

function setSentry(state: State, config: Config, user: User) {
	if (config.Online?.ErrorTracking) {
		let version = state.version;
		Sentry.init({
			dsn: "https://464814b9419a4880a2197b1df7e1d0ed@o399537.ingest.sentry.io/5256806",
			environment: state.environment || 'release',
			release: version.number
		});
		Sentry.configureScope((scope) => {
			if (user?.email) {
				scope.setUser({
					username: user.login,
					email: user.email
				});
			} else {
				scope.setUser({
					username: user?.login
				});
			}
		});
		if (version.sha) Sentry.configureScope((scope) => {
			scope.setTag('commit', version.sha as string);
		});
	}
}
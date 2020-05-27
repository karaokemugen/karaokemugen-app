import { SettingsStore, SettingsSuccess, SettingsFailure, Settings } from '../types/settings';

export const initialStateConfig: SettingsStore = {
	data: {
		state: {},
		config: {}
	},
	error: ''
}

export default function (state, action: SettingsSuccess | SettingsFailure) {
	switch (action.type) {
		case Settings.SETTINGS_SUCCESS:
			return {
				...state,
				data: {
					...action.payload
				},
				error: ''
			};
		case Settings.SETTINGS_FAILURE:
			return {
				...state,
				data: {
					state: {},
					config: {}
				},
				error: action.payload.error
			};
		default:
			return state;
	}
}

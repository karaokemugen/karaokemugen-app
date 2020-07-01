import { Settings,SettingsFailure, SettingsStore, SettingsSuccess } from '../types/settings';

export const initialStateConfig: SettingsStore = {
	data: {
		state: undefined,
		config: undefined,
		user: undefined
	},
	error: ''
};

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
				config: {},
				user: {}
			},
			error: action.payload.error
		};
	default:
		return state;
	}
}

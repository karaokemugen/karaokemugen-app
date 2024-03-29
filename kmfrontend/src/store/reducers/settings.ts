import { Settings, SettingsFailure, SettingsStore, SettingsSuccess } from '../types/settings';

export const initialStateConfig: SettingsStore = {
	data: {
		state: undefined,
		config: undefined,
		user: undefined,
		favorites: undefined,
		version: undefined,
	},
	error: '',
};

export default function settingsReducer(state, action: SettingsSuccess | SettingsFailure) {
	switch (action.type) {
		case Settings.SETTINGS_SUCCESS:
			return {
				...state,
				data: {
					...action.payload,
				},
				error: '',
			};
		case Settings.SETTINGS_FAILURE:
			return {
				...state,
				// Let the old data persists, as it will cause trouble with many components that except full objects.
				error: action.payload.error,
			};
		default:
			return state;
	}
}

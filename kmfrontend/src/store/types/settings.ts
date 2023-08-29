import { User } from '../../../../src/lib/types/user';
import { Config } from '../../../../src/types/config';
import { PublicState, Version } from '../../../../src/types/state';

// Action name
export enum Settings {
	SETTINGS_SUCCESS = 'settings_success',
	SETTINGS_FAILURE = 'settings_failure',
}

// Dispatch action
export interface SettingsSuccess {
	type: Settings.SETTINGS_SUCCESS;
	payload: SettingsStoreData;
}

export interface SettingsFailure {
	type: Settings.SETTINGS_FAILURE;
	payload: {
		error: string;
	};
}

// Store

export interface SettingsStore {
	data: SettingsStoreData;
	error: string;
}

export interface SettingsStoreData {
	state: PublicState;
	config: Config;
	user: User | {};
	favorites: Set<string>;
	version: Version;
}

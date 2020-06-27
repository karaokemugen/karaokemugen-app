import { Config } from "../../../../src/types/config";
import { State } from "../../../../src/types/state";
import { User } from "../../../../src/lib/types/user";

// Action name
export enum Settings {
	SETTINGS_SUCCESS = 'settings_success',
	SETTINGS_FAILURE = 'settings_failure'
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
	}
}

// Store

export interface SettingsStore {
	data: SettingsStoreData,
	error: string
}

export interface SettingsStoreData {
	state: State,
	config: Config,
	user: User
}
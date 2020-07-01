import { createContext, Dispatch } from 'react';

import { AuthStore } from './types/auth';
import { SettingsStore } from './types/settings';

export interface GlobalContextInterface {
	globalState: {
		auth: AuthStore,
		navigation: any,
		settings: SettingsStore
	}
	globalDispatch: Dispatch<any>
}

const GlobalContext = createContext<GlobalContextInterface>(null);

export default GlobalContext;
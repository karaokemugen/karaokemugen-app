import { createContext, Dispatch } from 'react';

import { AuthStore } from './types/auth';
import { FrontendContextStore } from './types/frontendContext';
import { SettingsStore } from './types/settings';

export interface GlobalContextInterface {
	globalState: {
		auth: AuthStore,
		frontendContext: FrontendContextStore,
		settings: SettingsStore
	}
	globalDispatch: Dispatch<any>
}

const GlobalContext = createContext<GlobalContextInterface>(null);

export default GlobalContext;
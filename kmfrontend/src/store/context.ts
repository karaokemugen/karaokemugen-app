import { createContext, Dispatch } from 'react';

import { AuthStore } from './types/auth';
import { FrontendContextStore } from './types/frontendContext';
import { ModalStore } from './types/modal';
import { SettingsStore } from './types/settings';

export interface GlobalContextInterface {
	globalState: {
		auth: AuthStore;
		frontendContext: FrontendContextStore;
		settings: SettingsStore;
		modal: ModalStore;
	};
	globalDispatch: Dispatch<any>;
}

const GlobalContext = createContext<GlobalContextInterface>(null);

export default GlobalContext;

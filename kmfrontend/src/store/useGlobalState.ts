import { useReducer } from 'react';

import AuthReducer, { initialStateAuth } from './reducers/auth';
import FrontendContextReducer from './reducers/frontendContext';
import ModalReducer from './reducers/modal';
import SettingsReducer, { initialStateConfig } from './reducers/settings';

// combine reducers ala Redux: each can handle its own slice
const combineReducers = slices => (prevState, action) =>
	// I like to use array.reduce, you can also just write a for..in loop
	Object.keys(slices).reduce(
		(nextState, nextProp) => ({
			...nextState,
			[nextProp]: slices[nextProp](prevState[nextProp], action)
		}),
		prevState
	);

const useGlobalState = () => {
	const [globalState, globalDispatch] = useReducer(combineReducers({
		auth: AuthReducer,
		frontendContext: FrontendContextReducer,
		modal: ModalReducer,
		settings: SettingsReducer
	}), {
		auth: initialStateAuth,
		frontendContext: {},
		modal: {},
		settings: initialStateConfig
	});
	return { globalState, globalDispatch };
};

export default useGlobalState;

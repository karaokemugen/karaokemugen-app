import { useReducer } from 'react';

import AuthReducer, { initialStateAuth } from './reducers/auth';
import NavigationReducer from './reducers/navigation';
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
		navigation: NavigationReducer,
		settings: SettingsReducer
	}), {
		auth: initialStateAuth,
		navigation: {},
		settings: initialStateConfig
	});
	return { globalState, globalDispatch };
};

export default useGlobalState;
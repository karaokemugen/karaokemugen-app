import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import createHistory from 'history/createBrowserHistory';

import navigation from './reducers/navigation';
import auth from './reducers/auth';
//import karas from './reducers/karas';

declare var window: any;

const initialState = {};
export const history = createHistory();
const middleware = [routerMiddleware(history)];

// If devtools is present use it's compose instead of redux's compose; Does the same thing
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default () => {
	const reducers = combineReducers({
		navigation,
		auth,
		//karas,
		router: routerReducer
	});
	const store = createStore(
		reducers,
		initialState, // default state
		composeEnhancers(applyMiddleware(...middleware))
	);
	return store;
};

import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import {createBrowserHistory} from 'history';

import navigation from './reducers/navigation';
import auth from './reducers/auth';

const initialState = {};

export const history = createBrowserHistory();

const middleware = [
	applyMiddleware(routerMiddleware(history))
];

export const store = createStore(
	combineReducers({ navigation, auth, router: routerReducer }),
	initialState,
	compose(...middleware)
);

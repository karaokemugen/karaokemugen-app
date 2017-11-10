import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { routerReducer, routerMiddleware } from 'react-router-redux'
import createHistory from 'history/createHashHistory'

import navigation from './reducers/navigation';

const initialState = {};

export const history = createHistory();

const middleware = [
	applyMiddleware(routerMiddleware(history))
];

export const store = createStore(
	combineReducers({ navigation, router: routerReducer }),
	initialState,
	compose(...middleware)
);

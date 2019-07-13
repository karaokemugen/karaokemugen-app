import React, { Component } from 'react';

import axios from 'axios';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import { Redirect, Route, Switch } from 'react-router-dom';
import {store, history } from './store';

import './App.css';
import KMPage from './layout/KMPage';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';

class App extends Component<{}, {}> {

	constructor(props) {
		super(props);
		const token = localStorage.getItem('kmToken');
		const onlineToken = localStorage.getItem('kmOnlineToken');
		if (token) {
			axios.defaults.headers.common['authorization'] = token;
			axios.defaults.headers.common['onlineAuthorization'] = onlineToken;
		}
	}

	render() {
		return (
			<Provider store={store}>
				<ConnectedRouter history={history}>
					<Switch>
						<Redirect from='/' exact to='/login'></Redirect>	
						<PrivateRoute path='/system' component={KMPage} />
						<Route path='/login' component={Login} />
					</Switch>
				</ConnectedRouter>
			</Provider>
		);
	}
}

export default App;

import axios from 'axios';
import { ConnectedRouter } from 'connected-react-router';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Redirect, Route, Switch } from 'react-router-dom';
import './App.css';
import PrivateRoute from './components/PrivateRoute';
import KMPage from './layout/KMPage';
import Login from './pages/Login';
import { history, store } from './store';

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
						<Redirect from='/system' exact to='/system/login'></Redirect>
						<PrivateRoute path='/system/km' component={KMPage} />
						<Route path='/system/login' component={Login} />
					</Switch>
				</ConnectedRouter>
			</Provider>
		);
	}
}

export default App;

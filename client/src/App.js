import React, {Component} from 'react';

import axios from 'axios';
import {Provider} from 'react-redux';
import {ConnectedRouter} from 'react-router-redux';
import {Redirect, Route, Switch} from 'react-router-dom';
import {history, store} from './store';

import KMMenu from './layout/KMMenu';
import Home from './pages/Home';
import Config from './pages/Config';
import Player from './pages/Player';
import Karas from './pages/Karas';
import Database from './pages/Database';
import Login from './pages/Login';
import AuthRequired from './layout/AuthRequired';

class App extends Component {

	componentWillMount() {
		const token = localStorage.getItem('kmToken');
		if (token) {
			axios.defaults.headers.common['authorization'] = token;
		}
	}

	render() {
		return (
			<Provider store={store}>
				<ConnectedRouter history={history}>
					<div>
						<KMMenu/>
						<Switch>
							<Redirect exact from='/' to='/home'/>
							<Route path='/home' component={Home}/>
							<Route path='/login' component={Login}/>
							<Route path='/config' component={AuthRequired(Config)}/>
							<Route path='/player' component={Player}/>
							<Route path='/karas' component={Karas}/>
							<Route path='/db' component={Database}/>
						</Switch>
					</div>
				</ConnectedRouter>
			</Provider>
		);
	}
}

export default App;

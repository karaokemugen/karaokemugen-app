import React, {Component} from 'react';

import axios from 'axios';
import {Provider} from 'react-redux';
import {ConnectedRouter} from 'react-router-redux';
import {Redirect, Route, Switch} from 'react-router-dom';
import {history, store} from './store';

import KMHeader from './layout/KMHeader';

import AuthRequired from './components/AuthRequired';
import DismissMessages from './components/DismissMessages';

import Login from './pages/Login';
import Home from './pages/Home';
import Config from './pages/Config';
import Karas from './pages/Karas';
import Database from './pages/Database';


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
						<KMHeader/>
						<Switch>
							<Redirect exact from='/' to='/home'/>
							<Route path='/home' component={Home}/>
							<Route path='/login' component={DismissMessages(Login)}/>
							<Route path='/config' component={AuthRequired(Config)}/>
							<Route path='/karas' component={AuthRequired(Karas)}/>
							<Route path='/db' component={AuthRequired(Database)}/>
						</Switch>
					</div>
				</ConnectedRouter>
			</Provider>
		);
	}
}

export default App;

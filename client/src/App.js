import React, {Component} from 'react';

import {Provider} from 'react-redux';
import {ConnectedRouter} from 'react-router-redux';
import {Route, Switch} from 'react-router-dom';
import {history, store} from './store';

import KMMenu from './layout/KMMenu';
import Home from './pages/Home';
import Config from './pages/Config';
import Player from './pages/Player';
import Karas from './pages/Karas';
import Database from './pages/Database';
import Login from './pages/Login';

class App extends Component {
	render() {
		return (
			<Provider store={store}>
				<ConnectedRouter history={history}>
					<div>
						<KMMenu/>
						<Switch>
							<Route path='/login' component={Login}/>
							<Route path='/home' component={Home}/>
							<Route path='/config' component={Config}/>
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

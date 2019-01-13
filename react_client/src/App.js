import React, {Component} from 'react';

import axios from 'axios';
import {Provider} from 'react-redux';
import {ConnectedRouter} from 'react-router-redux';
import {Redirect, Route, Switch} from 'react-router-dom';
import {Layout} from 'antd';
import {history, store} from './store';

import KMHeader from './layout/KMHeader';

import AuthRequired from './components/AuthRequired';
import DismissMessages from './components/DismissMessages';
import Home from './pages/Home';

import './App.css';

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
					<Layout className="layout">
						<KMHeader/>
						<Switch>
							<Redirect exact from='/system/' to='/system/home'/>
							<Route path='/system/home' component={Home}/>
							<Route path='/system/login' component={DismissMessages(import('./pages/Login'))}/>
							<Route path='/system/config' component={AuthRequired(import('./pages/Config'))}/>
							<Route path='/system/karas/create' component={AuthRequired(import('./pages/Karas/KaraEdit'))}/>
							<Route path='/system/karas/history' component={AuthRequired(import('./pages/Karas/History'))}/>
							<Route path='/system/karas/ranking' component={AuthRequired(import('./pages/Karas/Ranking'))}/>
							<Route path='/system/karas/viewcounts' component={AuthRequired(import('./pages/Karas/Viewcounts'))}/>
							<Route path='/system/karas/:kara_id' component={AuthRequired(import('./pages/Karas/KaraEdit'))}/>
							<Route path='/system/karas' component={AuthRequired(import('./pages/Karas/KaraList'))}/>
							<Route path='/system/series/new' component={AuthRequired(import('./pages/Series/SeriesEdit'))}/>
							<Route path='/system/series/:serie_id' component={AuthRequired(import('./pages/Series/SeriesEdit'))}/>
							<Route path='/system/series' component={AuthRequired(import('./pages/Series/SeriesList'))}/>
							<Route path='/system/db' component={AuthRequired(import('./pages/Database'))}/>
							<Route path='/system/users/create' component={AuthRequired(import('./pages/Users/UserEdit'))}/>
							<Route path='/system/users/:userId' component={AuthRequired(import('./pages/Users/UserEdit'))}/>
							<Route path='/system/users' component={AuthRequired(import('./pages/Users/UserList'))}/>
						</Switch>
					</Layout>
				</ConnectedRouter>
			</Provider>
		);
	}
}

export default App;

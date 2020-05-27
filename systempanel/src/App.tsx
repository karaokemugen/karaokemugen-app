import React, { Component } from 'react';
import { Redirect, Route, Switch, BrowserRouter as Router } from 'react-router-dom';
import './App.css';
import PrivateRoute from './components/PrivateRoute';
import KMPage from './layout/KMPage';
import Login from './pages/Login';
import { isAlreadyLogged } from './store/actions/auth';
import GlobalContext from './store/context';
import StartAxios from './axiosInterceptor';
import { setSettings } from './store/actions/settings';
import io from 'socket.io-client';

export let socket = io();
interface AppState {
	isInitialized: boolean;
}

class App extends Component<{}, AppState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			isInitialized: false
		};
	}

	async componentDidMount () {
		await isAlreadyLogged(this.context.globalDispatch);
		this.setState({isInitialized: true});
		socket.on('settingsUpdated', () => setSettings(this.context.globalDispatch));
	}

	render() {
		return (
			this.state.isInitialized ?
			<Router>
				<Switch>
					{/* The first redirect is needed only for dev, as in production the root is /system, whereas in dev is / */}
					<Redirect from='/' exact to='/system/login'></Redirect>
					<Redirect from='/system' exact to='/system/login'></Redirect>
					<PrivateRoute path='/system/km' component={KMPage} />
					<Route path='/system/login' component={Login} />
				</Switch>
			</Router> : <StartAxios></StartAxios>
		);
	}
}

export default App;

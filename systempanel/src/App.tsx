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
import * as Sentry from '@sentry/browser';

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

	setSentry = () => {
		if (this.context.globalState.settings.data.config.Online?.ErrorTracking) {
			let version = this.context.globalState.settings.data.state.version;
			Sentry.init({
				dsn: "https://464814b9419a4880a2197b1df7e1d0ed@o399537.ingest.sentry.io/5256806",
				environment: this.context.globalState.settings.data.state.environment || 'release',
				release: version.number
			});
			Sentry.configureScope((scope) => {
				let userConfig = this.context.globalState.settings.data.user;
				if (userConfig?.email) {
					scope.setUser({
						username: userConfig.login,
						email: userConfig.email
					});
				} else {
					scope.setUser({
						username: userConfig?.login
					});
				}
			});
			if (version.sha) Sentry.configureScope((scope) => {
				scope.setTag('commit', version.sha as string);
			});
		}
	}

	async componentDidMount () {
		await isAlreadyLogged(this.context.globalDispatch);
		this.setState({isInitialized: true});
		socket.on('settingsUpdated', () => setSettings(this.context.globalDispatch));
		if (!this.context.globalState.settings.data.state.sentrytest) this.setSentry();
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

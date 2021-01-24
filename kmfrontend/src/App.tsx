import React, { Component, lazy, Suspense } from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { isAlreadyLogged } from './store/actions/auth';
import { setSettings } from './store/actions/settings';
import GlobalContext from './store/context';
import Loading from './utils/components/Loading';
import PrivateRoute from './utils/PrivateRoute';
import { getSocket } from './utils/socket';

const KMSystem = lazy(() => import('./systempanel/layout/KMSystem'));
const KMFrontend = lazy(() => import('./frontend/KMFrontend'));
const Login = lazy(() => import('./utils/components/Login'));

interface AppState {
	isInitialized: boolean;
}

class App extends Component<unknown, AppState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		isInitialized: false
	};

	async componentDidMount () {
		await isAlreadyLogged(this.context.globalDispatch);
		this.setState({isInitialized: true});
		getSocket().on('settingsUpdated', this.setSettings);
	}

	componentWillUnmount () {
		getSocket().off('settingsUpdated', this.setSettings);
	}

	setSettings = () => setSettings(this.context.globalDispatch);

	render() {
		return (
			this.state.isInitialized ?
				<Router>
					<Suspense fallback={<Loading />}>
						<Switch>
							<Route path='/login' render={() => <Login
								context={this.context}
							/> }/>
							<PrivateRoute path='/system' component={KMSystem} />
							<PrivateRoute component={KMFrontend} />
						</Switch>
					</Suspense>
					<ToastContainer />
				</Router> : <Loading />
		);
	}
}

export default App;

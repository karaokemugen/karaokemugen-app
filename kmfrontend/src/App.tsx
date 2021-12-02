import i18next from 'i18next';
import { Component, lazy, Suspense } from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { isAlreadyLogged, logout } from './store/actions/auth';
import { setSettings } from './store/actions/settings';
import GlobalContext from './store/context';
import Loading from './utils/components/Loading';
import PrivateRoute from './utils/PrivateRoute';
import { getSocket } from './utils/socket';
import { displayMessage } from './utils/tools';

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
		if (window.location.pathname
			&& window.location.pathname !== '/'
			&& !window.location.pathname.includes('/public')
			&& this.context.globalState.auth.data.role !== 'admin') {
			displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
			logout(this.context.globalDispatch);
		}
		this.setState({isInitialized: true});
		getSocket().on('settingsUpdated', this.setSettings);
		getSocket().on('favoritesUpdated', this.setFavorites);
		getSocket().on('noFreeSpace', this.warningNoFreeSpace);
	}

	componentWillUnmount () {
		getSocket().off('settingsUpdated', this.setSettings);
		getSocket().off('favoritesUpdated', this.setFavorites);
		getSocket().off('noFreeSpace', this.warningNoFreeSpace);
	}

	setFavorites = username => {
		if (username === this.context.globalState.auth.data.username) {
			this.setSettings();
		}
	}

	setSettings = () => setSettings(this.context.globalDispatch);

	warningNoFreeSpace = () => {
		displayMessage('warning', i18next.t('REPOSITORIES.NO_FREE_SPACE'), 0);
	}

	render() {
		return (
			<>
				<div id="root">
					{this.state.isInitialized ?
						<Router>
							<Suspense fallback={<Loading />}>
								<Switch>
									<Route path='/login' component={Login} />
									<PrivateRoute path='/system' component={KMSystem} />
									<PrivateRoute component={KMFrontend} />
								</Switch>
							</Suspense>
							<ToastContainer icon={false} theme={'colored'}/>
						</Router> : <Loading />}
				</div>
				<div id="modal">{this.context.globalState.modal.modal}</div>
			</>
		);
	}
}

export default App;

import { ConnectedRouter } from 'connected-react-router';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Redirect, Route, Switch } from 'react-router-dom';
import './App.css';
import PrivateRoute from './components/PrivateRoute';
import KMPage from './layout/KMPage';
import Login from './pages/Login';
import { history, store } from './store';
import { isAlreadyLogged } from './actions/auth';

interface AppState {
	isInitialized: boolean;
}

class App extends Component<{}, AppState> {

	constructor(props) {
		super(props);
		this.state = {
			isInitialized: false
		};
	}

	componentWillMount(): void {
		isAlreadyLogged(store.dispatch)
			.catch(() => { /* Just to suppress a 'Uncaught (in promise) Error'  */ })
			.finally(() => {
				this.setState({
					isInitialized: true
				});
			});
	}

	render() {
		return (
			this.state.isInitialized &&
			<Provider store={store}>
				<ConnectedRouter history={history}>
					<Switch>
						{/* The first redirect is needed only for dev, as in production the root is /system, whereas in dev is / */}
						<Redirect from='/' exact to='/system/login'></Redirect>
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

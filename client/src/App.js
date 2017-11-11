import React, {Component} from 'react';

import {Provider} from 'react-redux';
import {ConnectedRouter} from 'react-router-redux';
import {history, store} from './store';

import KMMenu from './layout/KMMenu';


class App extends Component {
	render() {
		return (
			<Provider store={store}>
				<ConnectedRouter history={history}>
					<KMMenu/>
				</ConnectedRouter>
			</Provider>
		);
	}
}

export default App;

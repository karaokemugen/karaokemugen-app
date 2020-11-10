import React, { Component } from 'react';
import { RouteProps } from 'react-router';
import { Redirect, Route } from 'react-router-dom';

import GlobalContext from '../store/context';
import { setLastLocation } from './tools';

class PrivateRoute extends Component<RouteProps, unknown> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	render() {
		setLastLocation(this.props.location.pathname);
		const LoggedRoute = <Route {...this.props}/>;
		const NotLoggedRoute = <Redirect to={`/login${this.props.location.search}`}/>;
		const NextRoute = this.context.globalState.auth.isAuthenticated ? LoggedRoute : NotLoggedRoute;
		return (
			NextRoute
		);
	}
}

export default PrivateRoute;

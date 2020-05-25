import React, { Component } from 'react';
import { RouteProps } from 'react-router';
import { Redirect, Route } from 'react-router-dom';
import GlobalContext from '../store/context';

class PrivateRoute extends Component<RouteProps, {}> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	render() {
		const LoggedRoute = <Route {...this.props}/>
		const NotLoggedRoute = <Redirect to='/system/login'/>
		const NextRoute = this.context.globalState.auth.isAuthenticated ? LoggedRoute : NotLoggedRoute;
		return (
			NextRoute
		);
	}
}

export default PrivateRoute;

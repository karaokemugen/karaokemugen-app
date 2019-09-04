import React, { Component } from 'react';
import { connect } from 'react-redux';
import { RouteProps } from 'react-router';
import { Redirect, Route } from 'react-router-dom';

interface PrivateRouteProps extends RouteProps {
  isAuthenticated: boolean;
}

class PrivateRoute extends Component<PrivateRouteProps, {}> {

  render() {
    const LoggedRoute = <Route {...this.props}/>
    const NotLoggedRoute = <Redirect to='/system/login'/>
    const NextRoute = this.props.isAuthenticated ? LoggedRoute : NotLoggedRoute;
    return (
        NextRoute
    );
  }
}

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated
});

export default connect(mapStateToProps)(PrivateRoute);

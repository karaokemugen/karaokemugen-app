import React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { Route, Redirect } from 'react-router-dom';
import { RouteProps } from 'react-router';

interface PrivateRouteProps extends RouteProps {
  isAuthenticated: boolean;
}

class PrivateRoute extends Component<PrivateRouteProps, {}> {

  render() {
    const LoggedRoute = <Route {...this.props}></Route>
    const NotLoggedRoute = <Redirect to='/login'/>
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

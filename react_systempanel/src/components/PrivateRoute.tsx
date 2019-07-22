import React, { Component } from 'react';
import { connect } from 'react-redux';
import { RouteProps } from 'react-router';
import { Redirect, Route } from 'react-router-dom';
import { AuthentifactionApi } from '../api/authentication.api';

interface PrivateRouteProps extends RouteProps {
  isAuthenticated: boolean;
}

interface PrivateRouteState {
  logged: boolean; // Make sure to display the form only if you don't have already credential (F5 issue)
}

class PrivateRoute extends Component<PrivateRouteProps, PrivateRouteState> {

  constructor(props) {
    super(props);
    this.state = {
      logged: null
    };
  }

  componentDidMount() {
    AuthentifactionApi.isAuthenticated()
      .then(() => this.setState({logged:true}))
      .catch(() => this.setState({logged:false}));
  }

  render() {
    if(this.state.logged===null)
      return <div>Loading</div>

    const LoggedRoute = <Route {...this.props}></Route>
    const NotLoggedRoute = <Redirect to='/system/login'/>
    const NextRoute = this.state.logged ? LoggedRoute : NotLoggedRoute;
    return (
      NextRoute
    );
  }
}

const mapStateToProps = (state) => {
  console.log(state)
  return ({
  isAuthenticated: state.auth.isAuthenticated
})};

export default connect(mapStateToProps)(PrivateRoute);

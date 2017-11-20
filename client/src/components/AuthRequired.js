import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Redirect} from 'react-router-dom';
import Loading from './Loading';

export default function(ComposedComponent) {

	class Authentication extends Component {

		render() {
			if (this.props.authenticated === undefined) {
				return <Loading/>;
			} else if (this.props.authenticated) {
				return <ComposedComponent {...this.props} />;
			} else {
				return <Redirect to='/login' push={true}/>;
			}
		}
	}

	const mapStateToProps = (state) => ({
		authenticated: state.auth.authenticated
	});

	return connect(mapStateToProps)(Authentication);
}
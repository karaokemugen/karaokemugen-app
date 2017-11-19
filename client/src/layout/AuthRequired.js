import React, {Component} from 'react';
import {connect} from 'react-redux';
import {replace} from 'react-router-redux';
import {Redirect} from 'react-router-dom';

export default function(ComposedComponent) {

	class Authentication extends Component {

		componentWillMount() {
			if (!this.props.authenticated) {
				replace('/login');
			}
		}

		componentWillUpdate(nextProps) {
			if (!nextProps.authenticated) {
				replace('/login');
			}
		}

		render() {
			if (this.props.authenticated) {
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
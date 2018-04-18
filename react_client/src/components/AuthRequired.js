import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Redirect} from 'react-router-dom';
import Loading from './Loading';

export default function(ComposedComponentPromise) {

	class Authentication extends Component {

		state = {};

		componentWillMount() {
			ComposedComponentPromise.then(c => this.setState({ c: c}));
		}

		render() {
			if (this.props.authenticated === undefined || !this.state.c) {
				return <Loading/>;
			} else if (this.props.authenticated) {
				return this.state.c.default ? <this.state.c.default {...this.props} />
					: <this.state.c {...this.props} />;
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
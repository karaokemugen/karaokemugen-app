import React, {Component} from 'react';

import {connect} from 'react-redux';

import {dismissAll} from '../actions/navigation';

export default function(ComposedComponent) {

	class DismissMessages extends Component {

		componentWillMount() {
			this.props.dismissAll();
		}

		render() {
			return <ComposedComponent {...this.props} />;
		}
	}

	const mapDispatchToProps = (dispatch) => ({
		dismissAll: () => dispatch(dismissAll())
	});

	return connect(null, mapDispatchToProps)(DismissMessages);
}
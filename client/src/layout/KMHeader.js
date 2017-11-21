import React, {Component} from 'react';
import {connect} from 'react-redux';

import {checkAuth} from '../actions/auth';

import KMMenu from './KMMenu';
import Notifications from './Notifications';

class KMHeader extends Component {

	componentWillMount() {
		this.props.alreadyConnected();
	}

	render() {
		return (
			<div>
				<KMMenu/>
				<Notifications/>
			</div>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	alreadyConnected: () => checkAuth()(dispatch)
});

export default connect(null, mapDispatchToProps)(KMHeader);

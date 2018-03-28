import React, {Component} from 'react';
import {connect} from 'react-redux';

import {Layout} from "antd";

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
				<Layout.Header style={{height: '56px'}}>
					<KMMenu/>
				</Layout.Header>
				<Notifications/>
			</div>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	alreadyConnected: () => checkAuth()(dispatch)
});

export default connect(null, mapDispatchToProps)(KMHeader);

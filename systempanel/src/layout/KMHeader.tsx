import React, {Component} from 'react';
import {connect} from 'react-redux';

import {Layout} from 'antd';

import KMMenu from './KMMenu';
import Notifications from './Notifications';

class KMHeader extends Component<{}, {}> {
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

export default connect(null, null)(KMHeader);

import React, {Component} from 'react';
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

export default KMHeader;

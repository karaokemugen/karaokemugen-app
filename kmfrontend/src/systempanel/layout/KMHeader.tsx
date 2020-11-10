import {Layout} from 'antd';
import React, {Component} from 'react';

import { eventEmitter } from '../../utils/tools';
import Loading from '../components/Loading';
import KMMenu from './KMMenu';

class KMHeader extends Component<unknown, unknown> {

	state = {
		loading: false
	};

	componentDidMount() {
		eventEmitter.addChangeListener('loading', this.setLoading);
	}

	componentWillUnmount() {
		eventEmitter.removeChangeListener('loading', this.setLoading);
	}

	setLoading = (loading) => {
		this.setState({loading});
	}

	render() {
		return (
			<div>
				<Layout.Header style={{height: '56px'}}>
					<KMMenu/>
				</Layout.Header>
				<div className="UI-notification">
					<div className="UI-notification-loading">
						{this.state.loading ? (<Loading/>) : null}
					</div>
				</div>
			</div>
		);
	}
}

export default KMHeader;

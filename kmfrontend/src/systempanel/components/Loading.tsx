import { Alert, Spin } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';

import { eventEmitter } from '../../utils/tools';

class Loading extends Component<unknown, unknown> {
	state = {
		loading: false,
	};

	componentDidMount() {
		eventEmitter.addChangeListener('loading', this.setLoading);
	}

	componentWillUnmount() {
		eventEmitter.removeChangeListener('loading', this.setLoading);
	}

	setLoading = (loading) => {
		this.setState({ loading });
	};

	render() {
		return this.state.loading ? (
			<div className="UI-notification-loading">
				<Spin tip={i18next.t('LOADING')}>
					<Alert message="Loading" description="Please wait..." type="info" />
				</Spin>
			</div>
		) : null;
	}
}

export default Loading;

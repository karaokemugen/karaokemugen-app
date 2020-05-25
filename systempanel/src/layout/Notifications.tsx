import React, {Component} from 'react';
import {Alert} from 'antd';
import {infoMessage, errorMessage} from '../store/actions/navigation';
import Loading from '../components/Loading';
import GlobalContext from '../store/context';
import i18next from 'i18next';

class Notifications extends Component<{}, {}> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	info() {
		return this.context.globalState.navigation.infomsg ? (
			<Alert
				type="info"
				showIcon
				closable onClose={() => this.context.globalDispatch(infoMessage(null))}
				message={i18next.t('INFORMATION')}
				description={this.context.globalState.navigation.infomsg}
			/>
		) : null;
	}

	error() {
		return this.context.globalState.navigation.errormsg ? (
			<Alert
				type="error"
				showIcon
				closable onClose={() => this.context.globalDispatch(errorMessage(null))}
				message={i18next.t('ERROR')}
				description={this.context.globalState.navigation.errormsg}
			/>
		) : null;
	}

	loading() {
		return this.context.globalState.navigation.loading ? (<Loading/>) : null;
	}

	render() {
		return (
			<div className="UI-notification">
				<div className="UI-notification-message">
					{this.info()}
					{this.error()}
				</div>
				<div className="UI-notification-loading">
					{this.loading()}
				</div>
			</div>
		);
	}
}

export default Notifications;

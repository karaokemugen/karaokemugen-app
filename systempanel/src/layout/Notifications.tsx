import React, {Component} from 'react';

import {Alert} from 'antd';
import {connect} from 'react-redux';

import {infoMessage, warnMessage, errorMessage} from '../actions/navigation';
import Loading from '../components/Loading';

interface NotificationsProps {
	loading: boolean,

	dismissInfo: any,
	infomsg: string,

	dismissWarn: any,
	warnmsg: string,

	dismissError: any,
	errormsg: string,
}

interface NotificationsState {}

class Notifications extends Component<NotificationsProps, NotificationsState> {

	info() {
		return this.props.infomsg ? (
			<Alert
				type="info"
				showIcon
				closable onClose={this.props.dismissInfo}
				message="Information"
				description={this.props.infomsg}
			/>
		) : null;
	}

	warn() {
		return this.props.warnmsg ? (
			<Alert
				type="warning"
				showIcon
				closable onClose={this.props.dismissWarn}
				message="Warning"
				description={this.props.warnmsg}
			/>
		) : null;
	}

	error() {
		return this.props.errormsg ? (
			<Alert
				type="error"
				showIcon
				closable onClose={this.props.dismissError}
				message="Error"
				description={this.props.errormsg}
			/>
		) : null;
	}

	loading() {
		return this.props.loading ? (<Loading/>) : null;
	}

	render() {
		return (
			<div className="UI-notification">
				<div className="UI-notification-message">
					{this.info()}
					{this.warn()}
					{this.error()}
				</div>
				<div className="UI-notification-loading">
					{this.loading()}
				</div>
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	infomsg: state.navigation.infomsg,
	warnmsg: state.navigation.warnmsg,
	errormsg: state.navigation.errormsg,
	loading: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	dismissInfo: () => dispatch(infoMessage(null)),
	dismissWarn: () => dispatch(warnMessage(null)),
	dismissError: () => dispatch(errorMessage(null))
});

export default connect(mapStateToProps, mapDispatchToProps)(Notifications);

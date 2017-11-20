import React, {Component} from 'react';
import {Message, Icon} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {dismissInfo, dismissWarn, dismissError} from '../actions/navigation';

class Notifications extends Component {

	info() {
		return this.props.infomsg ? (
			<Message info onDismiss={this.props.dismissInfo}>
				<Icon name='info circle'/>
				<Message.Header>Information</Message.Header>
				{this.props.infomsg}
			</Message>
		) : null;
	}

	warn() {
		return this.props.warnmsg ? (
			<Message warning onDismiss={this.props.dismissWarn}>
				<Icon name='warning circle'/>
				<Message.Header>Avertissement</Message.Header>
				{this.props.warnmsg}
			</Message>
		) : null;
	}

	error() {
		return this.props.errormsg ? (
			<Message error onDismiss={this.props.dismissError}>
				<Icon name='minus circle'/>
				<Message.Header>Erreur</Message.Header>
				{this.props.errormsg}
			</Message>
		) : null;
	}

	render() {
		return (
			<div>
				{this.info()}
				{this.warn()}
				{this.error()}
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	infomsg: state.navigation.infomsg,
	warnmsg: state.navigation.warnmsg,
	errormsg: state.navigation.errormsg
});

const mapDispatchToProps = (dispatch) => ({
	dismissInfo: () => dispatch(dismissInfo()),
	dismissWarn: () => dispatch(dismissWarn()),
	dismissError: () => dispatch(dismissError())
});

export default connect(mapStateToProps, mapDispatchToProps)(Notifications);

import React, {Component} from 'react';
import {Message, Icon} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {infoMessage, warnMessage, errorMessage} from '../actions/navigation';
import Loading from '../components/Loading';

class Notifications extends Component {

	info() {
		return this.props.infomsg ? (
			<Message info onDismiss={this.props.dismissInfo}>
				<Message.Header><Icon name='info circle'/>Information</Message.Header>
				{this.props.infomsg}
			</Message>
		) : null;
	}

	warn() {
		return this.props.warnmsg ? (
			<Message warning onDismiss={this.props.dismissWarn}>
				<Message.Header><Icon name='warning circle'/>Avertissement</Message.Header>
				{this.props.warnmsg}
			</Message>
		) : null;
	}

	error() {
		return this.props.errormsg ? (
			<Message error onDismiss={this.props.dismissError}>
				<Message.Header><Icon name='minus circle'/>Erreur</Message.Header>
				{this.props.errormsg}
			</Message>
		) : null;
	}

	loading() {
		return this.props.loading ? (<Loading/>) : null;
	}

	render() {
		return (
			<div>
				{this.info()}
				{this.warn()}
				{this.error()}
				{this.loading()}
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

import React, {Component} from 'react';
import {NavLink} from 'react-router-dom';
import {Button, Container, Menu, Icon, Dropdown, Message} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {logout as logoutAction, checkAuth} from '../actions/auth';
import {dismissInfo, dismissWarn, dismissError} from '../actions/navigation';

class KMMenu extends Component {

	componentDidMount() {
		this.props.alreadyConnected();
	}

	connectMenu() {
		if (this.props.authenticated) {
			return (
				<Menu.Menu position='right'>
					<Menu.Item className='item'>
						<Dropdown trigger={(<span><Icon name='user' />{this.props.username}</span>)}/>
					</Menu.Item>
					<Menu.Item className='item'>
						<Button color='orange' onClick={this.props.logout}>Déconnexion</Button>
					</Menu.Item>
				</Menu.Menu>
			);
		} else {
			return (
				<Menu.Menu position='right'>
					<Menu.Item className='item'>
						<Button primary as={NavLink} to='/login'>Se connecter</Button>
					</Menu.Item>
				</Menu.Menu>
			);
		}
	}

	render() {
		return (
			<div>
				<Menu size='large' inverted>
					<Container>
						<Menu.Item to='/home' as={NavLink}>Accueil</Menu.Item>
						<Menu.Item to='/config' as={NavLink}>Configuration</Menu.Item>
						<Menu.Item to='/player' as={NavLink}>Player</Menu.Item>
						<Menu.Item to='/karas' as={NavLink}>Karas</Menu.Item>
						<Menu.Item to='/db' as={NavLink}>Base de données</Menu.Item>
						{this.connectMenu()}
					</Container>
				</Menu>
				{this.props.infomsg && (<Message info onDismiss={this.props.dismissInfo}>{this.props.infomsg}</Message>)}
				{this.props.warnmsg && (<Message warning onDismiss={this.props.dismissWarn}>{this.props.warnmsg}</Message>)}
				{this.props.errormsg && (<Message error onDismiss={this.props.dismissError}>{this.props.errormsg}</Message>)}
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	authenticated: state.auth.authenticated,
	username: state.auth.username,
	infomsg: state.navigation.infomsg,
	warnmsg: state.navigation.warnmsg,
	errormsg: state.navigation.errormsg
});

const mapDispatchToProps = (dispatch) => ({
	logout: () => dispatch(logoutAction()),
	alreadyConnected: () => checkAuth()(dispatch),
	dismissInfo: () => dispatch(dismissInfo()),
	dismissWarn: () => dispatch(dismissWarn()),
	dismissError: () => dispatch(dismissError()),
});

export default connect(mapStateToProps, mapDispatchToProps)(KMMenu);
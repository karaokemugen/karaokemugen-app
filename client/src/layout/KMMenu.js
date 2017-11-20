import React, {Component} from 'react';
import {connect} from 'react-redux';
import {NavLink} from 'react-router-dom';
import {Button, Container, Menu, Icon, Dropdown} from 'semantic-ui-react';

import {logout} from '../actions/auth';

class KMMenu extends Component {

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
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	authenticated: state.auth.authenticated,
	username: state.auth.username,
});

const mapDispatchToProps = (dispatch) => ({
	logout: () => dispatch(logout())
});

export default connect(mapStateToProps, mapDispatchToProps)(KMMenu);

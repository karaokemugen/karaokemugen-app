import React, {Component} from 'react';
import {Link, NavLink} from 'react-router-dom';
import {Button, Container, Menu} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {logout} from '../actions/auth';

const linkProps = {
	as: NavLink,
	link: true,
	activeClassName: 'active'
};

class KMMenu extends Component {

	connectButton(dispatch) {
		if (this.props.authenticated) {
			return (<Button color='orange' onClick={() => logout()(dispatch)}>Déconnexion</Button>);
		} else {
			return (<Button primary as={ Link } to='/login'>Se connecter</Button>);
		}
	}

	render() {
		const {dispatch} = this.props;

		return (
			<div>
				<Menu size='large' inverted>
					<Container>
						<Menu.Item to='/home' {...linkProps}>Accueil</Menu.Item>
						<Menu.Item to='/config' {...linkProps}>Configuration</Menu.Item>
						<Menu.Item to='/player' {...linkProps}>Player</Menu.Item>
						<Menu.Item to='/karas' {...linkProps}>Karas</Menu.Item>
						<Menu.Item to='/db' {...linkProps}>Base de données</Menu.Item>
						<Menu.Menu position='right'>
							<Menu.Item className='item'>
								{this.connectButton(dispatch)}
							</Menu.Item>
						</Menu.Menu>
					</Container>
				</Menu>
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	authenticated: state.auth.authenticated
});

export default connect(mapStateToProps)(KMMenu);
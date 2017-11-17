import React, {Component} from 'react';
import {Link, NavLink} from 'react-router-dom';
import {Button, Container, Menu} from 'semantic-ui-react';

const linkProps = {
	as: NavLink,
	link: true,
	activeClassName: 'active'
};

export default class KMMenu extends Component {

	render() {
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
								<Button as={ Link } to='/login'>Se connecter</Button>
							</Menu.Item>
							<Menu.Item>
								<Button as='a' primary>S'enregistrer</Button>
							</Menu.Item>
						</Menu.Menu>
					</Container>
				</Menu>
			</div>
		);
	}
}
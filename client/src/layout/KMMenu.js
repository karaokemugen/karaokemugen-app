import React, {Component} from 'react';
import {Button, Container, Menu} from 'semantic-ui-react';


export default class KMMenu extends Component {

	render() {
		return (
			<div>
				<Menu fixed='top' size='large' inverted>
					<Container>
						<Menu.Item as='a'>Accueil</Menu.Item>
						<Menu.Item as='a'>Configuration</Menu.Item>
						<Menu.Item as='a'>Player</Menu.Item>
						<Menu.Item as='a'>Karas</Menu.Item>
						<Menu.Item as='a'>Base de données</Menu.Item>
						<Menu.Menu position='right'>
							<Menu.Item className='item'>
								<Button as='a'>Se connecter</Button>
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
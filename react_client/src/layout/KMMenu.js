import React, {Component} from 'react';
import {connect} from 'react-redux';
import {push} from 'react-router-redux';
import {Link} from 'react-router-dom';
import {Menu, Icon, Button} from 'antd';

import {logout} from '../actions/auth';

class KMMenu extends Component {

	state = {
		current: '',
		connectOpenKeys: []
	};

	handleClick = (e) => {
		this.setState({
			current: e.key,
		});
	};

	connectMenu() {
		if (this.props.authenticated) {
			return (
				<div>
					<Menu
						mode='horizontal'
						theme='dark'
						style={{ lineHeight: '56px' }}
						onClick={() => this.setState({connectOpenKeys: []})}
						openKeys={this.state.connectOpenKeys}
					>
						<Menu.Item key='user'><span><Icon type='user' />{this.props.username}</span></Menu.Item>
						<Menu.Item key='logout'><Button icon='logout' onClick={this.props.logout}>Déconnexion</Button></Menu.Item>
					</Menu>
				</div>
			);
		} else {
			return (
				<div>
					<Menu
						mode='horizontal'
						theme='dark'
						style={{lineHeight: '56px'}}
						onClick={() => this.setState({connectOpenKeys: []})}
						openKeys={this.state.connectOpenKeys}
					>
						<Menu.Item key='login' style={{float: 'right'}}>
							<Button icon='login' onClick={() => this.props.push('/login')}>Connexion</Button>
						</Menu.Item>
					</Menu>
				</div>
			);
		}
	}

	render() {
		return (
			<div style={{display: 'flex', 'justify-content': 'space-between'}}>
				<div>
					<Menu
						mode='horizontal'
						theme='dark'
						style={{ lineHeight: '56px' }}
					>
						<Menu.Item key='home'><Link to='/home'>Accueil</Link></Menu.Item>
						<Menu.Item key='config'><Link to='/config'>Configuration</Link></Menu.Item>
						<Menu.Item key='karas'><Link to='/karas'>Karas</Link></Menu.Item>
						<Menu.Item key='db'><Link to='/db'>Base de données</Link></Menu.Item>
						<Menu.Item key='users'><Link to='/users'>Utilisateurs</Link></Menu.Item>
					</Menu>
				</div>
				{this.connectMenu()}
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	authenticated: state.auth.authenticated,
	username: state.auth.username,
});

const mapDispatchToProps = (dispatch) => ({
	logout: () => dispatch(logout()),
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(KMMenu);

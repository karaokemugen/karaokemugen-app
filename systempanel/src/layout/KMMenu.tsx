import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import {Menu, Icon, Button} from 'antd';
import styles from '../App.module.css';

import {logout} from '../actions/auth';

interface KMenuProps {
	username: string,
	logout: () => any,
}

class KMMenu extends Component<KMenuProps, {}> {

	state = {
		current: '',
		connectOpenKeys: []
	};

	handleClick = (e) => {
		this.setState({
			current: e.key,
		});
	};

	render() {
		return (
			<div style={{display: 'flex', justifyContent: 'space-between'}}>
				<Menu
					mode='horizontal'
					theme='dark'
					style={{ lineHeight: '56px' }}
				>
					<Menu.Item key='home'><Link to='/system/km/home'>Home</Link></Menu.Item>
					<Menu.SubMenu key="system-dropdown" title='System'>
						<Menu.Item key='log'><Link to='/system/km/log'>Logs</Link></Menu.Item>
						<Menu.Item key='config'><Link to='/system/km/config'>Configuration</Link></Menu.Item>
						<Menu.Item key='sessions'><Link to='/system/km/sessions'>Sessions</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="kara-dropdown" title='Karas'>
						<Menu.Item key='karalist'><Link to='/system/km/karas'>List</Link></Menu.Item>
						<Menu.Item key='karaimport'><Link to='/system/km/karas/create'>New</Link></Menu.Item>
						<Menu.Item key='karadownload'><Link to='/system/km/karas/download'>Download</Link></Menu.Item>
						<Menu.Item key='karablacklist'><Link to='/system/km/karas/blacklist'>Blacklist</Link></Menu.Item>
						<Menu.Item key='karahistory'><Link to='/system/km/karas/history'>History</Link></Menu.Item>
						<Menu.Item key='kararanking'><Link to='/system/km/karas/ranking'>Most requested</Link></Menu.Item>
						<Menu.Item key='karaviewcounts'><Link to='/system/km/karas/viewcounts'>Most played</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="serie-dropdown" title='Series'>
						<Menu.Item key='seriesmanage'><Link to='/system/km/series'>List</Link></Menu.Item>
						<Menu.Item key='seriesnew'><Link to='/system/km/series/new'>New</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="tags-dropdown" title='Tags'>
						<Menu.Item key='tagsmanage'><Link to='/system/km/tags'>List</Link></Menu.Item>
						<Menu.Item key='tagsnew'><Link to='/system/km/tags/new'>New</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.Item key='db'><Link to='/system/km/db'>Database</Link></Menu.Item>
					<Menu.SubMenu key="user-dropdown" title='Users'>
						<Menu.Item key='userlist'><Link to='/system/km/users'>User list</Link></Menu.Item>
						<Menu.Item key='newuser'><Link to='/system/km/users/create'>Create new user</Link></Menu.Item>
					</Menu.SubMenu>
				</Menu>

				<Menu
						mode='horizontal'
						theme='dark'
						style={{ lineHeight: '56px' }}
						onClick={() => this.setState({connectOpenKeys: []})}
						openKeys={this.state.connectOpenKeys}
					>
						<Menu.Item className={styles.menuItemInactive} key='user'>
							<span><Icon type='user' /> {this.props.username}</span>
						</Menu.Item>
						<Menu.Item key='logout'>
							<Button icon='logout' onClick={this.props.logout}>Log Out</Button>
						</Menu.Item>
				</Menu>
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	username: state.auth.data.username,
});

const mapDispatchToProps = (dispatch) => ({
	logout: () => logout(dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(KMMenu);

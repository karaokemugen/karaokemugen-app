import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import {Menu, Icon, Button} from 'antd';
import styles from '../App.module.css';
import {logout} from '../actions/auth';
import i18next from 'i18next';

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
					<Menu.Item key='home'><Link to='/system/km/home'>{i18next.t('MENU.HOME')}</Link></Menu.Item>
					<Menu.SubMenu key="system-dropdown" title={i18next.t('MENU.SYSTEM')}>
						<Menu.Item key='log'><Link to='/system/km/log'>{i18next.t('MENU.LOGS')}</Link></Menu.Item>
						<Menu.Item key='config'><Link to='/system/km/config'>{i18next.t('MENU.CONFIGURATION')}</Link></Menu.Item>
						<Menu.Item key='sessions'><Link to='/system/km/sessions'>{i18next.t('MENU.SESSIONS')}</Link></Menu.Item>
						<Menu.Item key='repositories'><Link to='/system/km/repositories'>{i18next.t('MENU.REPOSITORIES')}</Link></Menu.Item>
						<Menu.Item key='unused'><Link to='/system/km/unused'>{i18next.t('MENU.UNUSED_FILES')}</Link></Menu.Item>
						<Menu.Item key='db'><Link to='/system/km/db'>{i18next.t('MENU.DATABASE')}</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="kara-dropdown" title={i18next.t('MENU.KARAS')}>
						<Menu.Item key='karalist'><Link to='/system/km/karas'>{i18next.t('MENU.LIST')}</Link></Menu.Item>
						<Menu.Item key='karaimport'><Link to='/system/km/karas/create'>{i18next.t('MENU.NEW')}</Link></Menu.Item>
						<Menu.Item key='karadownload'><Link to='/system/km/karas/download'>{i18next.t('MENU.DOWNLOAD')}</Link></Menu.Item>
						<Menu.Item key='karablacklist'><Link to='/system/km/karas/blacklist'>{i18next.t('MENU.BLACKLIST')}</Link></Menu.Item>
						<Menu.Item key='karahistory'><Link to='/system/km/karas/history'>{i18next.t('MENU.HISTORY')}</Link></Menu.Item>
						<Menu.Item key='kararanking'><Link to='/system/km/karas/ranking'>{i18next.t('MENU.RANKING')}</Link></Menu.Item>
						<Menu.Item key='karaviewcounts'><Link to='/system/km/karas/viewcounts'>{i18next.t('MENU.VIEWCOUNTS')}</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="serie-dropdown" title={i18next.t('MENU.SERIES')}>
						<Menu.Item key='seriesmanage'><Link to='/system/km/series'>{i18next.t('MENU.LIST')}</Link></Menu.Item>
						<Menu.Item key='seriesnew'><Link to='/system/km/series/new'>{i18next.t('MENU.NEW')}</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="tags-dropdown" title={i18next.t('MENU.TAGS')}>
						<Menu.Item key='tagsmanage'><Link to='/system/km/tags'>{i18next.t('MENU.LIST')}</Link></Menu.Item>
						<Menu.Item key='tagsnew'><Link to='/system/km/tags/new'>{i18next.t('MENU.NEW')}</Link></Menu.Item>
					</Menu.SubMenu>
					<Menu.SubMenu key="user-dropdown" title={i18next.t('MENU.USERS')}>
						<Menu.Item key='userlist'><Link to='/system/km/users'>{i18next.t('MENU.LIST')}</Link></Menu.Item>
						<Menu.Item key='newuser'><Link to='/system/km/users/create'>{i18next.t('MENU.NEW')}</Link></Menu.Item>
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
							<Button icon='logout' onClick={this.props.logout}>{i18next.t('MENU.LOG_OUT')}</Button>
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

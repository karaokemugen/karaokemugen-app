import {
	DashboardOutlined,
	FileTextOutlined,
	HomeOutlined,
	LogoutOutlined,
	PullRequestOutlined,
	SettingOutlined,
	TagOutlined,
	UserOutlined,
} from '@ant-design/icons';
import { Menu } from 'antd';
import i18next from 'i18next';
import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { logout } from '../../store/actions/auth';
import GlobalContext from '../../store/context';

function KMMenu() {
	const context = useContext(GlobalContext);

	const haveMaintainerModeRepo =
		context.globalState.settings.data.config?.System?.Repositories.filter(
			repo => repo.Online && repo.MaintainerMode && repo.Enabled
		).length > 0;

	return (
		<Menu
			mode="inline"
			inlineIndent={10}
			style={{ minHeight: '100%' }}
			theme="dark"
			onClick={() => window.scrollTo(0, 0)}
		>
			<Menu.Item key="change" icon={<HomeOutlined />}>
				<Link to="/welcome">{i18next.t('HOME_BUTTON')}</Link>
			</Menu.Item>
			<Menu.Item key="home" icon={<DashboardOutlined />}>
				<Link to="/system/home">{i18next.t('MENU.HOME')}</Link>
			</Menu.Item>
			<Menu.SubMenu key="system-dropdown" title={i18next.t('MENU.SYSTEM')} icon={<SettingOutlined />}>
				<Menu.Item key="log">
					<Link to="/system/log">{i18next.t('MENU.LOGS')}</Link>
				</Menu.Item>
				<Menu.Item key="options">
					<Link to="/system/options">{i18next.t('MENU.ADVANCED_OPTIONS')}</Link>
				</Menu.Item>
				<Menu.Item key="config">
					<Link to="/system/config">{i18next.t('MENU.CONFIGURATION')}</Link>
				</Menu.Item>
				<Menu.Item key="users">
					<Link to="/system/users">{i18next.t('MENU.USERS')}</Link>
				</Menu.Item>
				<Menu.Item key="sessions">
					<Link to="/system/sessions">{i18next.t('MENU.SESSIONS')}</Link>
				</Menu.Item>
				<Menu.Item key="repositories">
					<Link to="/system/repositories">{i18next.t('MENU.REPOSITORIES')}</Link>
				</Menu.Item>
				<Menu.Item key="storage">
					<Link to="/system/storage">{i18next.t('MENU.STORAGE')}</Link>
				</Menu.Item>
				<Menu.Item key="unused">
					<Link to="/system/unused">{i18next.t('MENU.UNUSED_FILES')}</Link>
				</Menu.Item>
				<Menu.Item key="db">
					<Link to="/system/db">{i18next.t('MENU.DATABASE')}</Link>
				</Menu.Item>
				<Menu.Item key="background">
					<Link to="/system/backgrounds">{i18next.t('MENU.BACKGROUNDS')}</Link>
				</Menu.Item>
			</Menu.SubMenu>
			{haveMaintainerModeRepo ? (
				<Menu.SubMenu
					key="maintainer-dropdown"
					title={i18next.t('MENU.MAINTAINER')}
					icon={<PullRequestOutlined />}
				>
					<Menu.Item key="git">
						<Link to="/system/git">{i18next.t('MENU.GIT')}</Link>
					</Menu.Item>
					<Menu.Item key="inbox">
						<Link to="/system/inbox">{i18next.t('MENU.INBOX')}</Link>
					</Menu.Item>
				</Menu.SubMenu>
			) : null}
			<Menu.SubMenu key="kara-dropdown" title={i18next.t('MENU.KARAS')} icon={<FileTextOutlined />}>
				<Menu.Item key="karalist">
					<Link to="/system/karas">{i18next.t('MENU.LIST')}</Link>
				</Menu.Item>
				<Menu.Item key="karaimport">
					<Link to="/system/karas/create">{i18next.t('MENU.NEW')}</Link>
				</Menu.Item>
				<Menu.Item key="queuedownload">
					<Link to="/system/karas/download/queue">{i18next.t('MENU.DOWNLOAD_QUEUE')}</Link>
				</Menu.Item>
				<Menu.Item key="karadownload">
					<Link to="/system/karas/download">{i18next.t('MENU.DOWNLOAD')}</Link>
				</Menu.Item>
				<Menu.Item key="karahistory">
					<Link to="/system/karas/history">{i18next.t('MENU.HISTORY')}</Link>
				</Menu.Item>
				<Menu.Item key="kararanking">
					<Link to="/system/karas/ranking">{i18next.t('MENU.RANKING')}</Link>
				</Menu.Item>
				<Menu.Item key="karaviewcounts">
					<Link to="/system/karas/viewcounts">{i18next.t('MENU.VIEWCOUNTS')}</Link>
				</Menu.Item>
				<Menu.Item key="karabatchedit">
					<Link to="/system/karas/batch">{i18next.t('MENU.BATCH_EDIT')}</Link>
				</Menu.Item>
			</Menu.SubMenu>
			<Menu.SubMenu key="tags-dropdown" title={i18next.t('MENU.TAGS')} icon={<TagOutlined />}>
				<Menu.Item key="tagsmanage">
					<Link to="/system/tags">{i18next.t('MENU.LIST')}</Link>
				</Menu.Item>
				<Menu.Item key="tagsnew">
					<Link to="/system/tags/new">{i18next.t('MENU.NEW')}</Link>
				</Menu.Item>
				<Menu.Item key="tagsduplicate">
					<Link to="/system/tags/duplicate">{i18next.t('MENU.DUPLICATE')}</Link>
				</Menu.Item>
			</Menu.SubMenu>
			<Menu.Item className="menuItemInactive" key="user" icon={<UserOutlined />}>
				<span>{context.globalState.auth.data.username}</span>
			</Menu.Item>
			<Menu.Item key="logout" icon={<LogoutOutlined />} onClick={() => logout(context.globalDispatch)}>
				{i18next.t('LOGOUT')}
			</Menu.Item>
		</Menu>
	);
}

export default KMMenu;

import '../App.scss';

import { ConfigProvider, Layout, theme } from 'antd';
import enUS from 'antd/es/locale/en_US';
import esES from 'antd/es/locale/es_ES';
import frFR from 'antd/es/locale/fr_FR';
import idID from 'antd/es/locale/id_ID';
import ptPT from 'antd/es/locale/pt_PT';
import deDE from 'antd/es/locale/de_DE';
import itIT from 'antd/es/locale/it_IT';

import i18next from 'i18next';
import { Component } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';
import Loading from '../components/Loading';
import Background from '../pages/Background';
import Config from '../pages/Config';
import Database from '../pages/Database';
import Git from '../pages/Git';
import Home from '../pages/Home';
import Inbox from '../pages/Inbox';
import KaraHistory from '../pages/Karas/History';
import KaraBatchEdit from '../pages/Karas/KaraBatchEdit';
import KaraDownload from '../pages/Karas/KaraDownload';
import KaraEdit from '../pages/Karas/KaraEdit';
import KaraListPage from '../pages/Karas/KaraListPage';
import QueueDownload from '../pages/Karas/QueueDownload';
import KaraRanking from '../pages/Karas/Ranking';
import KaraViewcounts from '../pages/Karas/Viewcounts';
import Log from '../pages/Log';
import Options from '../pages/Options';
import RepositoriesEdit from '../pages/Repositories/RepositoriesEdit';
import RepositoriesList from '../pages/Repositories/RepositoriesList';
import SessionsEdit from '../pages/Sessions/SessionsEdit';
import SessionsList from '../pages/Sessions/SessionsList';
import Storage from '../pages/Storage';
import TagsDuplicate from '../pages/Tags/TagsDuplicate';
import TagsEdit from '../pages/Tags/TagsEdit';
import TagsList from '../pages/Tags/TagsList';
import UnusedList from '../pages/UnusedList';
import UserEdit from '../pages/Users/UserEdit';
import UserList from '../pages/Users/UserList';
import KMMenu from './KMMenu';

class KMSystem extends Component<unknown, unknown> {
	componentDidMount() {
		getSocket().on('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().on('operatorNotificationError', this.operatorNotificationError);
		getSocket().on('operatorNotificationWarning', this.operatorNotificationWarning);
		getSocket().on('operatorNotificationSuccess', this.operatorNotificationSuccess);
	}

	componentWillUnmount() {
		getSocket().off('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().off('operatorNotificationError', this.operatorNotificationError);
		getSocket().off('operatorNotificationWarning', this.operatorNotificationWarning);
		getSocket().off('operatorNotificationSuccess', this.operatorNotificationSuccess);
	}

	operatorNotificationInfo = (data: { code: string; data: string }) =>
		displayMessage('info', i18next.t(data.code, { data: data }));
	operatorNotificationError = (data: { code: string; data: string }) =>
		displayMessage('error', i18next.t(data.code, { data: data }));
	operatorNotificationWarning = (data: { code: string; data: string }) =>
		displayMessage('warning', i18next.t(data.code, { data: data }));
	operatorNotificationSuccess = (data: { code: string; data: string }) =>
		displayMessage('success', i18next.t(data.code, { data: data }));

	getLocale() {
		let locale = enUS;
		if (navigator.languages[0].includes('fr')) {
			locale = frFR;
		} else if (navigator.languages[0].includes('es')) {
			locale = esES;
		} else if (navigator.languages[0].includes('id')) {
			locale = idID;
		} else if (navigator.languages[0].includes('pt')) {
			locale = ptPT;
		} else if (navigator.languages[0].includes('de')) {
			locale = deDE;
		} else if (navigator.languages[0].includes('it')) {
			locale = itIT;
		}
		return locale;
	}

	render() {
		const locale = this.getLocale();
		return (
			<ConfigProvider
				locale={locale}
				theme={{
					algorithm: theme.darkAlgorithm,
					components: {
						Menu: {
							darkItemBg: '#1f1f1f',
							darkSubMenuItemBg: '#141414',
						},
					},
				}}
			>
				<Layout style={{ minHeight: '100vh' }}>
					<Layout.Sider collapsible>
						<KMMenu />
					</Layout.Sider>
					<Layout>
						<Loading />
						<Routes>
							<Route path="/home" element={<Home />} />
							<Route path="/log" element={<Log />} />
							<Route path="/options" element={<Options />} />
							<Route path="/config" element={<Config />} />
							<Route path="/storage" element={<Storage />} />
							<Route path="/unused" element={<UnusedList />} />
							<Route path="/backgrounds" element={<Background />} />

							<Route path="/sessions/new" element={<SessionsEdit />} />
							<Route path="/sessions/:seid" element={<SessionsEdit />} />
							<Route path="/sessions" element={<SessionsList />} />

							<Route path="/repositories/new" element={<RepositoriesEdit />} />
							<Route path="/repositories/:name" element={<RepositoriesEdit />} />
							<Route path="/repositories" element={<RepositoriesList />} />

							<Route path="/karas/download/queue" element={<QueueDownload />} />
							<Route path="/karas/download" element={<KaraDownload />} />
							<Route path="/karas/create" element={<KaraEdit />} />
							<Route path="/karas/history" element={<KaraHistory />} />
							<Route path="/karas/ranking" element={<KaraRanking />} />
							<Route path="/karas/viewcounts" element={<KaraViewcounts />} />
							<Route path="/karas/batch" element={<KaraBatchEdit />} />
							<Route path="/karas/:kid" element={<KaraEdit />} />
							<Route path="/karas" element={<KaraListPage />} />

							<Route path="/tags/duplicate" element={<TagsDuplicate />} />
							<Route path="/tags/new" element={<TagsEdit />} />
							<Route path="/tags/:tid" element={<TagsEdit />} />
							<Route path="/tags" element={<TagsList />} />

							<Route path="/db" element={<Database />} />
							<Route path="/git" element={<Git />} />
							<Route path="/inbox" element={<Inbox />} />

							<Route path="/users/create" element={<UserEdit />} />
							<Route path="/users/:username" element={<UserEdit />} />
							<Route path="/users" element={<UserList />} />

							<Route path="/km" element={<Navigate to="/system/home" />} />
							<Route path="*" element={<Navigate to="/system/home" />} />
						</Routes>
					</Layout>
				</Layout>
			</ConfigProvider>
		);
	}
}

export default KMSystem;

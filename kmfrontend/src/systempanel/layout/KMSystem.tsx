import '../App.scss';

import { ConfigProvider, Layout } from 'antd';
import enUS from 'antd/es/locale/en_US';
import frFR from 'antd/es/locale/fr_FR';
import i18next from 'i18next';
import { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import TasksEvent from '../../TasksEvent';
import { getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';
import Loading from '../components/Loading';
import Config from '../pages/Config';
import Database from '../pages/Database';
import Git from '../pages/Git';
import Home from '../pages/Home';
import KaraHistory from '../pages/Karas/History';
import KaraBatchEdit from '../pages/Karas/KaraBatchEdit';
import KaraDownload from '../pages/Karas/KaraDownload';
import KaraEdit from '../pages/Karas/KaraEdit';
import KaraList from '../pages/Karas/KaraList';
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
	}

	componentWillUnmount() {
		getSocket().off('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().off('operatorNotificationError', this.operatorNotificationError);
		getSocket().off('operatorNotificationWarning', this.operatorNotificationWarning);
	}

	operatorNotificationInfo = (data: { code: string, data: string }) => displayMessage('info', i18next.t(data.code, { data: data }));
	operatorNotificationError = (data: { code: string, data: string }) => displayMessage('error', i18next.t(data.code, { data: data }));
	operatorNotificationWarning = (data: { code: string, data: string }) => displayMessage('warning', i18next.t(data.code, { data: data }));

	render() {
		return (
			<ConfigProvider locale={navigator.languages[0].includes('fr') ? frFR : enUS}>
				<Layout>
					<Layout.Sider>
						<KMMenu />
					</Layout.Sider>
					<Layout>
						<Loading />
						<TasksEvent limit={5} />
						<Switch>
							<Redirect from='/system/km' to='/system/home' />
							<Redirect from='/system' exact to='/system/home' />
							<Route path='/system/home' component={Home} />

							<Route path='/system/log' component={Log} />
							<Route path='/system/options' component={Options} />
							<Route path='/system/config' component={Config} />
							<Route path='/system/storage' component={Storage} />
							<Route path='/system/unused' component={UnusedList} />

							<Route path='/system/sessions/new' component={SessionsEdit} />
							<Route path='/system/sessions/:seid' component={SessionsEdit} />
							<Route path='/system/sessions' component={SessionsList} />

							<Route path='/system/repositories/new' component={RepositoriesEdit} />
							<Route path='/system/repositories/:name' component={RepositoriesEdit} />
							<Route path='/system/repositories' component={RepositoriesList} />

							<Route path='/system/karas/download/queue' component={QueueDownload} />
							<Route path='/system/karas/download' component={KaraDownload} />
							<Route path='/system/karas/create' component={KaraEdit} />
							<Route path='/system/karas/history' component={KaraHistory} />
							<Route path='/system/karas/ranking' component={KaraRanking} />
							<Route path='/system/karas/viewcounts' component={KaraViewcounts} />
							<Route path='/system/karas/batch' component={KaraBatchEdit} />
							<Route path='/system/karas/:kid' component={KaraEdit} />
							<Route path='/system/karas' component={KaraList} />

							<Route path='/system/tags/duplicate' component={TagsDuplicate} />
							<Route path='/system/tags/new' component={TagsEdit} />
							<Route path='/system/tags/:tid' component={TagsEdit} />
							<Route path='/system/tags' component={TagsList} />

							<Route path='/system/db' component={Database} />
							<Route path='/system/git' component={Git} />

							<Route path='/system/users/create' component={UserEdit} />
							<Route path='/system/users/:userLogin' component={UserEdit} />
							<Route path='/system/users' component={UserList} />
						</Switch>
					</Layout>
				</Layout>
			</ConfigProvider>
		);
	}
}

export default KMSystem;

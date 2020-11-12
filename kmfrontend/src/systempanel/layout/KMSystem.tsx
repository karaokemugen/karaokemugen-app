import '../App.scss';

import { ConfigProvider, Layout } from 'antd';
import enUS from 'antd/es/locale/en_US';
import frFR from 'antd/es/locale/fr_FR';
import i18next from 'i18next';
import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { logout } from '../../store/actions/auth';
import GlobalContext from '../../store/context';
import TasksEvent from '../../TasksEvent';
import { displayMessage } from '../../utils/tools';
import Config from '../pages/Config';
import Database from '../pages/Database';
import Home from '../pages/Home';
import KaraHistory from '../pages/Karas/History';
import KaraBatchEdit from '../pages/Karas/KaraBatchEdit';
import KaraBlacklist from '../pages/Karas/KaraBlacklist';
import KaraDownload from '../pages/Karas/KaraDownload';
import KaraEdit from '../pages/Karas/KaraEdit';
import KaraList from '../pages/Karas/KaraList';
import KaraRanking from '../pages/Karas/Ranking';
import KaraViewcounts from '../pages/Karas/Viewcounts';
import Log from '../pages/Log';
import Options from '../pages/Options';
import RepositoriesEdit from '../pages/Repositories/RepositoriesEdit';
import RepositoriesList from '../pages/Repositories/RepositoriesList';
import SessionsEdit from '../pages/Sessions/SessionsEdit';
import SessionsList from '../pages/Sessions/SessionsList';
import TagsDuplicate from '../pages/Tags/TagsDuplicate';
import TagsEdit from '../pages/Tags/TagsEdit';
import TagsList from '../pages/Tags/TagsList';
import UnusedList from '../pages/UnusedList';
import UserEdit from '../pages/Users/UserEdit';
import UserList from '../pages/Users/UserList';
import KMHeader from './KMHeader';

class KMSystem extends Component<unknown, unknown> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	componentDidMount() {
		if (this.context.globalState.auth.data.role !== 'admin') {
			displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
			logout(this.context.globalDispatch);
		}
	}

	render() {
		return (
			<ConfigProvider locale={navigator.languages[0].includes('fr') ? frFR : enUS}>
				<Layout className="pageLayout">
					<KMHeader />
					<TasksEvent limit={5} />
					<Switch>
						<Redirect from='/system/km' exact to='/system/km/home'/>
						<Route path='/system/km/home' component={Home}/>

						<Route path='/system/km/log' component={Log}/>
						<Route path='/system/km/options' component={Options}/>
						<Route path='/system/km/config' component={Config}/>
						<Route path='/system/km/unused' component={UnusedList}/>

						<Route path='/system/km/sessions/new' component={SessionsEdit}/>
						<Route path='/system/km/sessions/:seid' component={SessionsEdit}/>
						<Route path='/system/km/sessions' component={SessionsList}/>

						<Route path='/system/km/repositories/new' component={RepositoriesEdit}/>
						<Route path='/system/km/repositories/:name' component={RepositoriesEdit}/>
						<Route path='/system/km/repositories' component={RepositoriesList}/>

						<Route path='/system/km/karas/download' component={KaraDownload}/>
						<Route path='/system/km/karas/blacklist' component={KaraBlacklist}/>
						<Route path='/system/km/karas/create' component={KaraEdit}/>
						<Route path='/system/km/karas/history' component={KaraHistory}/>
						<Route path='/system/km/karas/ranking' component={KaraRanking}/>
						<Route path='/system/km/karas/viewcounts' component={KaraViewcounts}/>
						<Route path='/system/km/karas/batch' component={KaraBatchEdit}/>
						<Route path='/system/km/karas/:kid' component={KaraEdit}/>
						<Route path='/system/km/karas' component={KaraList}/>

						<Route path='/system/km/tags/duplicate' component={TagsDuplicate}/>
						<Route path='/system/km/tags/new' component={TagsEdit}/>
						<Route path='/system/km/tags/:tid' component={TagsEdit}/>
						<Route path='/system/km/tags' component={TagsList}/>

						<Route path='/system/km/db' component={Database}/>

						<Route path='/system/km/users/create' component={UserEdit}/>
						<Route path='/system/km/users/:userLogin' component={UserEdit}/>
						<Route path='/system/km/users' component={UserList}/>
					</Switch>
				</Layout>
			</ConfigProvider>
		);
	}
}

export default KMSystem;

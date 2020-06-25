import { Layout } from 'antd';
import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import styles from '../App.module.css';
import Config from '../pages/Config';
import Database from '../pages/Database';
import Home from '../pages/Home';
import KaraHistory from '../pages/Karas/History';
import KaraBlacklist from '../pages/Karas/KaraBlacklist';
import KaraDownload from '../pages/Karas/KaraDownload';
import KaraEdit from '../pages/Karas/KaraEdit';
import KaraList from '../pages/Karas/KaraList';
import KaraRanking from '../pages/Karas/Ranking';
import KaraViewcounts from '../pages/Karas/Viewcounts';
import Log from '../pages/Log';
import TagsDuplicate from '../pages/Tags/TagsDuplicate';
import TagsList from '../pages/Tags/TagsList';
import TagsEdit from '../pages/Tags/TagsEdit';
import UserEdit from '../pages/Users/UserEdit';
import UserList from '../pages/Users/UserList';
import KMHeader from './KMHeader';
import SessionsList from '../pages/Sessions/SessionsList';
import SessionsEdit from '../pages/Sessions/SessionsEdit';
import RepositoriesList from '../pages/Repositories/RepositoriesList';
import RepositoriesEdit from '../pages/Repositories/RepositoriesEdit';
import UnusedList from '../pages/UnusedList';
import TasksEvent from '../pages/Components/TasksEvent';
import KaraBatchEdit from '../pages/Karas/KaraBatchEdit';
import Options from '../pages/Options';

class KMPage extends Component<{}, {}> {
	render() {
		return (
      <Layout className={styles.pageLayout}>
        <KMHeader />
        <TasksEvent limit={5} />
        <Switch>
          <Redirect from='/system/km' exact to='/system/km/home'></Redirect>
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
		);
	}
}

export default KMPage;

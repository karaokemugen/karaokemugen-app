import React from 'react';
import {Component} from 'react';
import {connect} from 'react-redux';
import { Route, Redirect, Switch} from 'react-router-dom';
import KMHeader from './KMHeader';
import {Layout} from 'antd';
import styles from '../App.module.css';

import Home from '../pages/Home';
import Log from '../pages/Log';
import Config from '../pages/Config';
import KaraDownload from '../pages/Karas/KaraDownload';
import KaraBlacklist from '../pages/Karas/KaraBlacklist';
import KaraEdit from '../pages/Karas/KaraEdit';
import KaraHistory from '../pages/Karas/History';
import KaraRanking from '../pages/Karas/Ranking';
import KaraViewcounts from '../pages/Karas/Viewcounts';
import KaraList from '../pages/Karas/KaraList';
import SeriesEdit from '../pages/Series/SeriesEdit';
import SeriesList from '../pages/Series/SeriesList';
import Database from '../pages/Database';
import UserEdit from '../pages/Users/UserEdit';
import UserList from '../pages/Users/UserList';

class KMPage extends Component<{}, {}> {
	render() {
		return (
      <Layout className={styles.pageLayout}>
        <KMHeader />
        <Switch>
          <Redirect from='/system' exact to='/system/home'></Redirect>	
          <Route path='/system/home' component={Home}/>   

          <Route path='/system/log' component={Log}/>

          <Route path='/system/config' component={Config}/>

          <Route path='/system/karas/download' component={KaraDownload}/>
          <Route path='/system/karas/blacklist' component={KaraBlacklist}/>
          <Route path='/system/karas/create' component={KaraEdit}/>
          <Route path='/system/karas/history' component={KaraHistory}/>
          <Route path='/system/karas/ranking' component={KaraRanking}/>
          <Route path='/system/karas/viewcounts' component={KaraViewcounts}/>
          <Route path='/system/karas/:kid' component={KaraEdit}/>
          <Route path='/system/karas' component={KaraList}/>

          <Route path='/system/series/new' component={SeriesEdit}/>
          <Route path='/system/series/:sid' component={SeriesEdit}/>
          <Route path='/system/series' component={SeriesList}/>

          <Route path='/system/db' component={Database}/>

          <Route path='/system/users/create' component={UserEdit}/>
          <Route path='/system/users/:userLogin' component={UserEdit}/>
          <Route path='/system/users' component={UserList}/>
        </Switch>
      </Layout>
		);
	}
}

export default connect(null, null)(KMPage);

import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ProfilModal from './modals/ProfilModal';
import LoginModal from './modals/LoginModal';
import logo from '../assets/Logo-final-fond-transparent.png';
import Autocomplete from './generic/Autocomplete';
import ReactDOM from 'react-dom';
import { getSocket } from './tools';
import store from '../store';
import OnlineStatsModal from './modals/OnlineStatsModal';
import { Config } from '../../../src/types/config';
import { Token } from '../../../src/lib/types/user';
import { Session } from '../../../src/types/session';
import { News } from '../types/news';
import Switch from './generic/Switch';
import WelcomePageArticle from './WelcomePageArticle';
import WelcomePageTasks from './WelcomePageTasks';
import { Repository } from '../../../src/lib/types/repo';

require ('../styles/welcome/WelcomePage.scss');

interface IProps {
	navigatorLanguage: string;
	config: Config;
}

interface IState {
	news: Array<News>;
	sessions: Array<Session>;
	activeSession?: Session;
	catchphrase?: string;
	repositories: Array<Repository>;
	stats?: any;
}
class WelcomePage extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			news: [],
			sessions: [],
			repositories: []
		};
		if (!store.getLogInfos() || !(store.getLogInfos() as Token).token) {
			this.openLoginOrProfileModal();
		} else if (this.props.config.Online.Stats === undefined) {
			ReactDOM.render(<OnlineStatsModal />, document.getElementById('modal'));
		}
	}

	componentDidMount() {
		this.getCatchphrase();
		this.getNewsFeed();
		this.getSessions();
		this.getRepositories();
		this.getStats();
		getSocket().on('statsRefresh', this.getStats);
		store.addChangeListener('loginOut', this.openLoginOrProfileModal);
		store.addChangeListener('loginUpdated', this.getSessions);
	}
	componentWillUnmount() {
		store.removeChangeListener('loginOut', this.openLoginOrProfileModal);
		store.removeChangeListener('loginUpdated', this.getSessions);
	}

  getSessions = async () => {
  	if (store.getLogInfos() && (store.getLogInfos() as Token).role === 'admin') {
		  const res = await axios.get('/api/sessions');
  		this.setState({
  			sessions: res.data,
  			activeSession: res.data.filter((valueSession:Session) => valueSession.active)[0]
		  });
  	}
  };

  getRepositories = async () => {
	const res = await axios.get('/api/repos');
	this.setState({
		repositories: res.data
	});
  };

  getStats = async () => {
	const res = await axios.get('/api/stats');
	this.setState({
		stats: res.data
	});
  };

  setActiveSession = async (value:string) => {
  	var sessions:Array<Session> = this.state.sessions.filter(
  		session => session.name === value
  	);
  	var sessionId;
  	if (sessions.length === 0) {
  		const res = await axios.post('/api/sessions', { name: value });
  		sessionId = res.data;
  		const sessionsList = await axios.get('/api/sessions');
  		this.setState({
  			sessions: sessionsList.data,
  			activeSession: sessionsList.data.filter((valueSession:Session) => valueSession.active)[0]
  		});
  	} else {
  		this.setState({ activeSession: sessions[0] });
  		sessionId = sessions[0].seid;
  		axios.post('/api/sessions/' + sessionId);
  	}
  };

	majPrivate = async () => {
		let session = this.state.activeSession as Session;
		session.private = !(this.state.activeSession as Session).private;
		await axios.put(`/api/sessions/${session.seid}`, session);
		this.getSessions();
	};

  getCatchphrase = async () => {
  	const res = await axios.get('/api/catchphrase');
  	this.setState({ catchphrase: res.data });
  };

  getNewsFeed = async () => {
  	const res = await axios.get('/api/newsfeed');
  	const data = res.data;
  	var base = data[0];
  	var appli = data[1];
  	var mast = data[2];
  	var news:Array<News> = [];
  	if (base.body && appli.body) {
  		base.body = JSON.parse(base.body);
  		appli.body = JSON.parse(appli.body);
  		news = [
  			{
  				html: base.body.feed.entry[0].content._text,
  				date: base.body.feed.entry[0].updated._text,
  				dateStr: new Date(
  					base.body.feed.entry[0].updated._text
  				).toLocaleDateString(),
  				title:
            i18next.t('BASE_UPDATE') +
            ' : ' +
            base.body.feed.title._text +
            (base.body.feed.entry[0].summary._text
            	? ' - ' + base.body.feed.entry[0].summary._text
            	: ''),
  				link: base.body.feed.entry[0].link._attributes.href,
  				type: 'base'
  			},
  			{
  				html: appli.body.feed.entry[0].content._text,
  				date: appli.body.feed.entry[0].updated._text,
  				dateStr: new Date(
  					appli.body.feed.entry[0].updated._text
  				).toLocaleDateString(),
  				title:
            i18next.t('APP_UPDATE') +
            ' : ' +
            appli.body.feed.entry[0].title._text +
            (appli.body.feed.entry[0].summary._text
            	? ' - ' + appli.body.feed.entry[0].summary._text
            	: ''),
  				link: appli.body.feed.entry[0].link._attributes.href,
  				type: 'app'
  			}
  		];
  	}

  	if (mast.body) {
  		mast.body = JSON.parse(mast.body);
  		var max =
        mast.body.rss.channel.item.length > 3
        	? 3
        	: mast.body.rss.channel.item.length;
  		for (var i = 0; i < max; i++) {
  			news.push({
  				html: mast.body.rss.channel.item[i].description._text,
  				date: mast.body.rss.channel.item[i].pubDate._text,
  				dateStr: new Date(
  					mast.body.rss.channel.item[i].pubDate._text
  				).toLocaleDateString(),
  				title: mast.body.rss.channel.item[i].title._text,
  				link: mast.body.rss.channel.item[i].link._text,
  				type: 'mast'
  			});
  		}
  	}
  	news.sort((a, b) => {
  		var dateA = new Date(a.date);
  		var dateB = new Date(b.date);
  		return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
  	});
  	this.setState({ news: news });
  };

  openLoginOrProfileModal = () => {
  	if (!store.getLogInfos() || !(store.getLogInfos() as Token).token) {
  		ReactDOM.render(<LoginModal
  			scope='admin'
  		/>, document.getElementById('modal'));
  	} else {
  		ReactDOM.render(<ProfilModal
  			config={this.props.config}
  		/>, document.getElementById('modal'));
  	}
  };

  render() {
	  var logInfos = store.getLogInfos();
	  var sessions:[{label:string, value:string}?] = [];
  	if (logInfos && logInfos.role === 'admin') {
  		this.state.sessions.forEach(session => {
  			sessions.push({ label: session.name, value: session.name });
  		});
	  }
  	return (
      <div id="welcomePage">
        <div className="welcomePage--wrapper">

          <div className="logo">
            <img src={logo} alt="Logo Karaoke Mugen" />
          </div>
          <WelcomePageTasks limit={3}/>
          <div className="aside">
            <nav>
              <ul>
                <li><a href="http://mugen.karaokes.moe/contact.html"><i className="fas fa-pencil-alt" />{i18next.t('WLCM_CONTACT')}</a></li>
                <li><a href="http://mugen.karaokes.moe/"><i className="fas fa-link" />{i18next.t('WLCM_SITE')}</a></li>
                <li><a href="#" onClick={this.openLoginOrProfileModal}><i className="fas fa-user" /><span>{logInfos && logInfos.token ? decodeURIComponent(logInfos.username) : i18next.t('NOT_LOGGED')}</span></a></li>
               {
                logInfos && logInfos.token ? (
					<li>
						<a
							href="#"
							title={i18next.t('LOGOUT')}
							className="logout"
							onClick={() => {
							store.logOut();
							this.openLoginOrProfileModal();
							}}
						><i className="fas fa-sign-out-alt" /><span>{i18next.t('LOGOUT')}</span></a>
					</li>
                  ) : null
                }
              </ul>
            </nav>
            <div className="session-setting">
              {logInfos && logInfos.role === 'admin' && sessions.length > 0 ? (
                <React.Fragment>
                  <article className="active-session">
                    <label className="menu-top-sessions-label">{i18next.t('ACTIVE_SESSION')}</label>
                    <Autocomplete
                      value={this.state.activeSession?.name}
                      options={sessions}
                      onChange={this.setActiveSession}
                      acceptNewValues={true}
                    />
                  </article>
                  <article className="private-session">
                    <label className="menu-top-sessions-label">{i18next.t('PRIVATE_SESSION')}</label>
                    <Switch handleChange={this.majPrivate} isChecked={this.state.activeSession?.private} />
                  </article>
                </React.Fragment>
              ) : null}
              </div>
          </div>

          <main className="main">

            <section className="tiles-panel">
              {
                this.props.config.App.FirstRun
                ? <article className="tile-tutorial">
                    <button type="button" onClick={() => window.open('/admin' + window.location.search)}>
                      <i className="fas fa-hand-point-right" /><span>{i18next.t('WLCM_GETSTARTED')}</span>
                    </button>
                  </article>
                : <article className="tile-manage">
                  <button type="button" onClick={() => window.open('/admin' + window.location.search)}>
                    <i className="fas fa-list" /><span>{i18next.t('WLCM_KARAMANAGER')}</span>
                  </button>
                </article>
              }
              <article className="tile-system">
                <button type="button" onClick={() => window.open('/system')}>
                  <i className="fas fa-cog" /><span>{i18next.t('WLCM_ADMINISTRATION')}</span>
                </button>
              </article>
              <article className="tile-system">
                <button type="button" onClick={() => window.open('/' + window.location.search)}>
                  <i className="fas fa-user" /><span>{i18next.t('WLCM_PUBLIC')}</span>
                </button>
              </article>
              <article className="tile-help">
                <button type="button" onClick={() => window.open('https://mugen.karaokes.moe/docs/')}>
                  <i className="fas fa-question-circle" /><span>{i18next.t('WLCM_HELP')}</span>
                </button>
              </article>
              <article className="tile-download">
                <button type="button" onClick={() => window.open('/system/km/karas/download')}>
                  <i className="fas fa-download" /><span>{i18next.t('WLCM_DOWNLOAD')}</span>
                </button>
              </article>
              <article className="tile-logs">
                <button type="button" onClick={() => window.open('/system/km/log')}>
                  <i className="fas fa-terminal" /><span>{i18next.t('WLCM_LOGS')}</span>
                </button>
              </article>
              <article className="tile-stats">
                <blockquote>
                  <label>
                    <i className="fas fa-chart-line" />{i18next.t('WLCM_STATS')}
                  </label>
                  <ul>
                    <li onClick={() => window.open('/system/km/karas')}>
						<strong>{i18next.t('WLCM_STATS_KARAS')}</strong>
						<span>{this.state.stats?.karas}</span>
					</li>
                    <li onClick={() => window.open('/system/km/series')}>
						<strong>{i18next.t('WLCM_STATS_SERIES')}</strong>
						<span>{this.state.stats?.series}</span>
					</li>
                    <li onClick={() => window.open('/system/km/tags')}>
						<strong>{i18next.t('WLCM_STATS_TAGS')}</strong>
						<span>{this.state.stats?.tags}</span>
					</li>
                  </ul>
                </blockquote>
              </article>
              <article className="tile-repositories">
                <blockquote>
                  <button type="button" onClick={() => window.open('/system/km/repositories')}>
                    <i className="fas fa-network-wired" />{i18next.t('WLCM_REPOSITORY')}
                  </button>
                  <ul>
					  {this.state.repositories.map(repository => {
						  return (
							<li key={repository.Name} className={repository.Enabled ? '' : 'disabled'}
								onClick={() => window.open(`/system/km/repositories/${repository.Name}`)}>
								<i className={`fas ${repository.Online ? " fa-globe" : "fa-laptop"}`} />
								<span>{repository.Name}</span>
							</li>
						  );
					  })}
                  </ul>
                </blockquote>
              </article>
            </section>

            <section className="feed-panel">
              <header>
                <p>{this.state.catchphrase}</p>
              </header>
              <div>
                {this.state.news.map(article => {
                  return (
                    <WelcomePageArticle key={article.date} article={article} />
                  );
                })}
              </div>
            </section>

          </main>

        </div>
  		</div>
  	);
  }
}

export default WelcomePage;

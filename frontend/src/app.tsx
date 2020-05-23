import { Switch, Route } from 'react-router';
import WelcomePage from './components/WelcomePage';
import AdminPage from './components/AdminPage';
import PublicPage from './components/PublicPage';
import React, { Component } from 'react';
import i18n from './components/i18n';
import NotFoundPage from './components/NotfoundPage';
import axios from 'axios';
import { startIntro, getSocket, is_touch_device } from './components/tools';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import store from './store';
import { Config } from '../../src/types/config';
import { KaraTag } from '../../src/lib/types/kara'; 
import { DBYear } from '../../src/lib/types/database/kara';
import { Tag }  from '../../src/lib/types/tag'; 
import { Tag as FrontendTag }  from './types/tag';
import SetupPage from './components/SetupPage';

interface IState {
	admpwd: string | undefined;
	shutdownPopup: boolean;
	config?: Config;
	tags?: Array<KaraTag>;
	mediaFile?: string;
	electron: boolean;
	displaySetupPage: boolean;
	os?: string;
	dataPath?: string
  }

class App extends Component<{}, IState> {
	constructor(props:{}) {
		super(props);
		this.state = {
			admpwd: window.location.search.indexOf('admpwd') !== -1 ? window.location.search.split('=')[1] : undefined,
			shutdownPopup: false,
			electron: false,
			displaySetupPage: false
		};
		axios.defaults.headers.common['authorization'] = localStorage.getItem('kmToken');
		axios.defaults.headers.common['onlineAuthorization'] = localStorage.getItem('kmOnlineToken');
	}

	async checkAuth() {
		try {
			await axios.get('/api/auth/checkauth')
		} catch (error) {
			// if error the authorization must be broken so we delete it
			store.logOut();
		}
	}

	async parseTags() {
		const response = await axios.get('/api/tags');
		return response.data.content.filter((val:Tag) => val.karacount !== null)
			.map((val:{i18n:{[key: string]: string}, tid:string, name:string, types:Array<number|string>, karacount:string}) => {
			var trad = val.i18n![store.getNavigatorLanguage() as string];
			return { value: val.tid, label: trad ? trad : val.name, type: val.types, karacount: val.karacount };
		});
	}

	async parseYears() {
		const response = await axios.get('/api/years');
		return response.data.content.map((val:DBYear) => {
			return { value: val.year, label: val.year, type: ['year'], karacount: val.karacount };
		});
	}

	async componentDidMount() {
		if (axios.defaults.headers.common['authorization']) {
			await this.checkAuth();
			await store.setUser();
		}
		if (this.state.admpwd && !localStorage.getItem('kmToken')) {
			var result = await axios.post('/api/auth/login', { username: 'admin', password: this.state.admpwd });
			store.setLogInfos(result.data);
		}
		await this.getSettings();
		getSocket().on('settingsUpdated', this.getSettings);
		getSocket().on('connect', () => this.setState({ shutdownPopup: false }));
		getSocket().on('disconnect', (reason:any) => {
			if (reason === 'transport error') {
				this.setState({ shutdownPopup: true })
			}
		});
		this.addTags();
		if (this.state.config && this.state.config.App.FirstRun && window.location.pathname === '/admin') {
			startIntro('admin');
		}
		store.addChangeListener('loginUpdated', this.addTags);
	}

    addTags = async () => {
    	if (this.state.config && this.state.config.Frontend.Mode !== 0 && axios.defaults.headers.common['authorization']) {
    		const [tags, years] = await Promise.all([this.parseTags(), this.parseYears()]);
    		this.setState({ tags: tags.concat(years) });
    	}
    }

    componentWillUnmount() {
    	store.removeChangeListener('loginUpdated', this.addTags);
    }

    getSettings = async () => {
    	const res = await axios.get('/api/settings');
		store.setConfig(res.data.config);
		store.setVersion(res.data.version);
		store.setModePlaylistID(res.data.state.modePlaylistID);
		store.setDefaultLocaleApp(res.data.state.defaultLocale);
		this.setState({ config: res.data.config, electron: res.data.state.electron, os: res.data.state.os,
			dataPath: res.data.state.dataPath,
			displaySetupPage:  res.data.config.App.FirstRun && store.getLogInfos()?.username === 'admin' });
    };

    powerOff = () => {
    	axios.post('/api/shutdown');
    	this.setState({ shutdownPopup: true });
    };

    showVideo = (file:string) => {
		this.setState({mediaFile: file});
		document.addEventListener('keyup', this.closeVideo);
	};
	
	closeVideo = (e:KeyboardEvent) => {
		if(e.key == 'Escape') {
			this.setState({mediaFile: undefined});
			document.removeEventListener('keyup', this.closeVideo);
		}
	};

    render() {
    	return (
    		this.state.shutdownPopup ?
    			<div className="shutdown-popup">
    				<div className="noise-wrapper" style={{ opacity: 1 }}>
    					<div className="noise"></div>'
				    </div>
    				<div className="shutdown-popup-text">{i18n.t('SHUTDOWN_POPUP')}<br />{'·´¯`(>_<)´¯`·'}</div>
    				<button title={i18n.t('TOOLTIP_CLOSEPARENT')} className="closeParent btn btn-action"
    					onClick={() => this.setState({ shutdownPopup: false })}>
    					<i className="fas fa-times"></i>
    				</button>
    			</div> :
    			this.state.config ?
    				<div className={is_touch_device() ? 'touch' : ''}>
    					<Switch>
							<Route path="/welcome" render={(props) => 
							this.state.displaySetupPage ? 
								<SetupPage {...props} instance={(this.state.config as Config).Online.Host as string} os={this.state.os as string}
									electron={this.state.electron} repository={(this.state.config as Config).System.Repositories[0]}
									dataPath={this.state.dataPath as string} endSetup={() => this.setState({displaySetupPage: false})}/> :
								<WelcomePage {...props}
									config={this.state.config as Config} />
							} />
    						<Route path="/admin" render={(props) => <AdminPage {...props}
    							powerOff={this.state.electron ? undefined : this.powerOff} tags={this.state.tags as FrontendTag[]}
    							showVideo={this.showVideo} config={this.state.config as Config} 
								getSettings={this.getSettings} />} />
    						<Route exact path="/" render={(props) => <PublicPage {...props}
								tags={this.state.tags as FrontendTag[]} showVideo={this.showVideo}
								config={this.state.config as Config} />} />
    						<Route component={NotFoundPage} />
    					</Switch>
						<a id="downloadAnchorElem" />
    					{this.state.mediaFile ?
    						<div className="overlay" onClick={() => {
								this.setState({mediaFile: undefined});
								document.removeEventListener('keyup', this.closeVideo);
							}}>
    							<video id="video" autoPlay src={`/medias/${encodeURIComponent(this.state.mediaFile)}`} />
    						</div> : null
    					}
    					<ToastContainer />
    				</div> : null
    	);
    }
}

export default App;
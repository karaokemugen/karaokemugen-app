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
import { Tag } from '../../src/lib/types/tag';
import { Tag as FrontendTag } from './types/tag';
import SetupPage from './components/SetupPage';
import * as Sentry from '@sentry/browser';
import { PublicState } from '../../src/types/state';

require('./axiosInterceptor');

interface IState {
	admpwd: string | undefined;
	shutdownPopup: boolean;
	config?: Config;
	tags?: Array<KaraTag>;
	mediaFile?: string;
	displaySetupPage: boolean;
}

class App extends Component<{}, IState> {
	constructor(props: {}) {
		super(props);
		this.state = {
			admpwd: window.location.search.indexOf('admpwd') !== -1 ? window.location.search.split('=')[1] : undefined,
			shutdownPopup: false,
			displaySetupPage: false
		};
		axios.defaults.headers.common['authorization'] = localStorage.getItem('kmToken');
		axios.defaults.headers.common['onlineAuthorization'] = localStorage.getItem('kmOnlineToken');
	}

	async checkAuth() {
		try {
			await axios.get('/auth/checkauth')
		} catch (error) {
			// if error the authorization must be broken so we delete it
			store.logOut();
		}
	}

	async parseTags() {
		const response = await axios.get('/tags');
		return response.data.content.filter((val: Tag) => val.karacount !== null)
			.map((val: { i18n: { [key: string]: string }, tid: string, name: string, types: Array<number | string>, karacount: string }) => {
				let trad = val.i18n[store.getNavigatorLanguage() as string];
				return { value: val.tid, label: trad ? trad : (val.i18n['eng'] ? val.i18n['eng'] : val.name), type: val.types, karacount: val.karacount };
			});
	}

	async parseYears() {
		const response = await axios.get('/years');
		return response.data.content.map((val: DBYear) => {
			return { value: val.year, label: val.year, type: ['year'], karacount: val.karacount };
		});
	}

	async componentDidMount() {
		if (axios.defaults.headers.common['authorization']) {
			await this.checkAuth();
			await store.setUser();
		}
		if (this.state.admpwd && !localStorage.getItem('kmToken')) {
			let result = await axios.post('/auth/login', { username: 'admin', password: this.state.admpwd });
			store.setLogInfos(result.data);
		}
		await this.getSettings();
		getSocket().on('settingsUpdated', this.getSettings);
		getSocket().on('connect', () => this.setState({ shutdownPopup: false }));
		getSocket().on('disconnect', (reason: any) => {
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
		const res = await axios.get('/settings');
		let state:PublicState = res.data.state;
		store.setConfig(res.data.config);
		store.setVersion(res.data.version);
		store.setState(res.data.state);
		this.setState({
			config: res.data.config,
			displaySetupPage: res.data.config.App.FirstRun && store.getLogInfos()?.username === 'admin'
		});
		if (!state.sentrytest) this.setSentry(state.environment);
	};

	setSentry = (environment: string) => {
		if (store.getConfig().Online?.ErrorTracking) {
			Sentry.init({
				dsn: "https://464814b9419a4880a2197b1df7e1d0ed@o399537.ingest.sentry.io/5256806",
				environment: environment || 'release',
				release: store.getVersion().number,
				ignoreErrors: ['Network Error', 'Request failed with status code']
			});
			Sentry.configureScope((scope) => {
				let userConfig = store.getUser();
				if (userConfig?.email) {
					scope.setUser({
						username: userConfig.login,
						email: userConfig.email
					});
				} else {
					scope.setUser({
						username: userConfig?.login
					});
				}
			});
			if (store.getVersion().sha) Sentry.configureScope((scope) => {
				scope.setTag('commit', store.getVersion().sha as string);
			});
		}
	}

	powerOff = () => {
		axios.post('/shutdown');
		this.setState({ shutdownPopup: true });
	};

	showVideo = (file: string) => {
		this.setState({ mediaFile: file });
		document.addEventListener('keyup', this.closeVideo);
	};

	closeVideo = (e: KeyboardEvent) => {
		if (e.key == 'Escape') {
			this.setState({ mediaFile: undefined });
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
									<SetupPage {...props} instance={(this.state.config as Config).Online.Host as string}
										repository={(this.state.config as Config).System.Repositories[0]}
										endSetup={() => this.setState({ displaySetupPage: false })} /> :
									<WelcomePage {...props}
										config={this.state.config as Config} />
							} />
							<Route path="/admin" render={(props) => <AdminPage {...props}
								powerOff={store.getState().electron ? undefined : this.powerOff} tags={this.state.tags as FrontendTag[]}
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
								this.setState({ mediaFile: undefined });
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
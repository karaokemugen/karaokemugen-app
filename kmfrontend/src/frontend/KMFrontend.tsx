import './KMFrontend.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import { Route,Switch } from 'react-router';

import GlobalContext from '../store/context';
import { isElectron } from '../utils/electron';
import { commandBackend, getSocket } from '../utils/socket';
import { callModal, is_touch_device,startIntro } from '../utils/tools';
import AdminPage from './components/AdminPage';
import ChibiPage from './components/ChibiPage';
import ShutdownModal from './components/modals/ShutdownModal';
import NotFoundPage from './components/NotfoundPage';
import PublicPage from './components/public/PublicPage';
import SetupPage from './components/SetupPage';
import WelcomePage from './components/WelcomePage';

interface IState {
	shutdownPopup: boolean;

	mediaFile?: string;
	displaySetupPage: boolean;
}

class KMFrontend extends Component<unknown, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: unknown) {
		super(props);
		this.state = {
			shutdownPopup: false,
			displaySetupPage: false
		};
	}

	async componentDidMount() {
		await this.setState({
			displaySetupPage: this.context?.globalState.settings.data.config?.App.FirstRun
				&& this.context.globalState.auth.data.username === 'admin'
		});
		getSocket().on('connect', () => this.setState({ shutdownPopup: false }));
		getSocket().on('disconnect', (reason: any) => {
			if (reason === 'transport error') {
				this.setState({ shutdownPopup: true });
			}
		});

		if (this.context?.globalState.settings.data.config?.App.FirstRun && window.location.pathname === '/admin') {
			startIntro();
		}
	}

	powerOff = () => {
		callModal('confirm', `${i18next.t('SHUTDOWN')} ?`, '', async () => {
			await commandBackend('shutdown');
			this.setState({ shutdownPopup: true });
		});
	};

	showVideo = (file: string) => {
		this.setState({ mediaFile: file });
		document.addEventListener('keyup', this.closeVideo);
	};

	closeVideo = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			this.setState({ mediaFile: undefined });
			document.removeEventListener('keyup', this.closeVideo);
		}
	};

	render() {
		return (
			this.state.shutdownPopup ?
				<ShutdownModal close={() => this.setState({ shutdownPopup: false })} /> :
				this.context.globalState.settings.data.config ?
					<div className={is_touch_device() ? 'touch' : ''}>
						<Switch>
							<Route path="/welcome" render={() =>
								this.state.displaySetupPage ?
									<SetupPage
										endSetup={() => this.setState({ displaySetupPage: false })} /> :
									<WelcomePage />
							} />
							<Route path="/admin" render={() => <AdminPage
								powerOff={isElectron() ? undefined : this.powerOff}
								 showVideo={this.showVideo} />} />
							<Route path="/chibi" exact component={ChibiPage} />
							<Route exact path="/" render={() => <PublicPage showVideo={this.showVideo} />} />
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
					</div> : null
		);
	}
}

export default KMFrontend;

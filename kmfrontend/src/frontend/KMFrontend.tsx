import './KMFrontend.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router';

import GlobalContext from '../store/context';
import { isElectron } from '../utils/electron';
import { commandBackend, getSocket } from '../utils/socket';
import { callModal, is_touch_device, startIntro } from '../utils/tools';
import AdminPage from './components/AdminPage';
import ChibiPage from './components/ChibiPage';
import MigratePage from './components/MigratePage';
import ShutdownModal from './components/modals/ShutdownModal';
import NotFoundPage from './components/NotfoundPage';
import PublicPage from './components/public/PublicPage';
import SetupPage from './components/SetupPage';
import WelcomePage from './components/WelcomePage';

interface IState {
	shutdownPopup: boolean;
}

class KMFrontend extends Component<unknown, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: unknown) {
		super(props);
		this.state = {
			shutdownPopup: false
		};
	}

	async componentDidMount() {
		getSocket().on('connect', () => this.setState({ shutdownPopup: false }));
		getSocket().on('disconnect', (reason: any) => {
			if (reason === 'transport error') {
				this.setState({ shutdownPopup: true });
			}
		});

		if (!this.context?.globalState.settings.data.user?.flag_tutorial_done && window.location.pathname === '/admin') {
			startIntro();
		}
	}

	powerOff = () => {
		callModal(this.context.globalDispatch, 'confirm', `${i18next.t('SHUTDOWN')} ?`, '', async () => {
			await commandBackend('shutdown');
			this.setState({ shutdownPopup: true });
		});
	};

	render() {
		return (
			this.state.shutdownPopup ?
				<ShutdownModal close={() => this.setState({ shutdownPopup: false })} /> :
				this.context.globalState.settings.data.config ?
					<div className={is_touch_device() ? 'touch' : ''}>
						<Switch>
							<Route path="/setup" render={(route) => <SetupPage route={route} />} />
							<Route path="/migrate" render={() => <MigratePage />} />
							<Route path="/welcome" render={() => <WelcomePage />} />
							<Route path="/admin" render={() => <AdminPage
								powerOff={isElectron() ? undefined : this.powerOff} />} />
							<Route path="/chibi" exact component={ChibiPage} />
							<Route path="/public" render={(route) => <PublicPage route={route} />} />
							<Route exact path="/"><Redirect to="/public" /></Route>
							<Route component={NotFoundPage} />
						</Switch>
						<a id="downloadAnchorElem" />
					</div> : null
		);
	}
}

export default KMFrontend;

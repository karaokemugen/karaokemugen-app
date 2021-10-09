import './KMFrontend.scss';

import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import GlobalContext from '../store/context';
import { isElectron } from '../utils/electron';
import { commandBackend, getSocket } from '../utils/socket';
import { callModal, is_touch_device, startIntro } from '../utils/tools';
import AdminPage from './components/AdminPage';
import ChibiPage from './components/ChibiPage';
import MigratePage from './components/MigratePage';
import ShutdownModal from './components/modals/ShutdownModal';
import NotFoundPage from './components/NotfoundPage';
import PlaylistPage from './components/PlaylistPage';
import PublicPage from './components/public/PublicPage';
import SetupPage from './components/setup/SetupPage';
import WelcomePage from './components/WelcomePage';

function KMFrontend() {
	const context = useContext(GlobalContext);
	const [shutdownPopup, setShutdownPopup] = useState(false);

	const updateUser = async (flag_sendstats: boolean) => {
		const user = context?.globalState.settings.data.user;
		user.flag_sendstats = flag_sendstats;
		try {
			await commandBackend('editMyAccount', user);
		} catch (e) {
			// already display
		}
	};

	const powerOff = () => {
		callModal(context.globalDispatch, 'confirm', `${i18next.t('SHUTDOWN')} ?`, '', async () => {
			try {
				await commandBackend('shutdown');
				setShutdownPopup(true);
			} catch (e) {
				// already display
			}
		});
	};

	useEffect(() => {
		getSocket().on('connect', () => setShutdownPopup(false));
		getSocket().on('disconnect', (reason: any) => {
			if (reason === 'transport error') {
				setShutdownPopup(true);
			}
		});

		if (context?.globalState.settings.data.user?.flag_sendstats === null) {
			callModal(context.globalDispatch, 'confirm', i18next.t('MODAL.STATS_MODAL.TITLE'), <>
				{i18next.t('MODAL.STATS_MODAL.DESC')}
				<br />
				<br />
				{i18next.t('MODAL.STATS_MODAL.REFUSE_DESC')}
				<br />
				<br />
				{i18next.t('MODAL.STATS_MODAL.CHANGE')}
			</>, updateUser, '', undefined, true);
		}

		if (!context?.globalState.settings.data.user?.flag_tutorial_done && window.location.pathname === '/admin') {
			startIntro();
		}
	}, []);

	return (
		shutdownPopup ?
			<ShutdownModal close={() => setShutdownPopup(false)} /> :
			context.globalState.settings.data.config ?
				<div className={is_touch_device() ? 'touch' : ''}>
					<Switch>
						<Route path="/setup" component={SetupPage} />
						<Route path="/migrate" component={MigratePage} />
						<Route path="/welcome" component={WelcomePage} />
						<Route path="/admin" render={() => <AdminPage
							powerOff={isElectron() ? undefined : powerOff} />} />
						<Route path="/chibi" exact component={ChibiPage} />
						<Route path="/chibiPlaylist" exact component={PlaylistPage} />
						<Route path="/public" component={PublicPage} />
						<Route exact path="/">{context.globalState.auth.data.role === 'admin' ?
							<Redirect to="/welcome" /> : <Redirect to="/public" />
						}</Route>
						<Route component={NotFoundPage} />
					</Switch>
					<a id="downloadAnchorElem" />
				</div> : null
	);
}

export default KMFrontend;

import i18next from 'i18next';
import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { isAlreadyLogged, logout } from './store/actions/auth';
import { setSettings } from './store/actions/settings';
import GlobalContext from './store/context';
import Loading from './utils/components/Loading';
import PrivateRoute from './utils/PrivateRoute';
import { getSocket } from './utils/socket';
import { displayMessage, is_touch_device } from './utils/tools';

const KMSystem = lazy(() => import('./systempanel/layout/KMSystem'));
const KMFrontend = lazy(() => import('./frontend/KMFrontend'));
const Login = lazy(() => import('./utils/components/Login'));

function App() {
	const context = useContext(GlobalContext);
	const location = useLocation();
	const [initialized, setInitialized] = useState(false);

	const setFavorites = username => {
		if (username === context.globalState.auth.data.username) {
			setSettingsStore();
		}
	};

	const setSettingsStore = () => setSettings(context.globalDispatch);

	const warningNoFreeSpace = () => {
		displayMessage('warning', i18next.t('REPOSITORIES.NO_FREE_SPACE'), 0);
	};

	const songDownloadedFromInbox = song => {
		displayMessage('success', i18next.t('INBOX.SONG_DOWNLOADED_FROM_INBOX', { song: song?.name }), 5000);
	};

	const songDownloadedFromInboxFailed = () => {
		displayMessage('error', i18next.t('INBOX.SONG_DOWNLOADED_FROM_INBOX_FAILED'), 5000);
	};

	const logoutIfNotAdminInAdminPath = async () => {
		// add a trailing slash
		const path = location.pathname !== '/' ? location.pathname?.slice(1) + '/' : '';
		if (
			path &&
			['admin', 'system', 'welcome'].includes(path.slice(0, path.indexOf('/'))) &&
			context.globalState.auth.data.role &&
			context.globalState.auth.data.role !== 'admin'
		) {
			await logout(context.globalDispatch);
			displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
		}
	};

	useEffect(() => {
		isAlreadyLogged(context.globalDispatch).then(() => {
			setInitialized(true);
			getSocket().on('settingsUpdated', setSettingsStore);
			getSocket().on('noFreeSpace', warningNoFreeSpace);
			getSocket().on('songDownloadedFromInbox', songDownloadedFromInbox);
			getSocket().on('songDownloadedFromInboxFailed', songDownloadedFromInboxFailed);
		});
		return () => {
			getSocket().off('settingsUpdated', setSettingsStore);
			getSocket().off('noFreeSpace', warningNoFreeSpace);
			getSocket().off('songDownloadedFromInbox', songDownloadedFromInbox);
			getSocket().off('songDownloadedFromInboxFailed', songDownloadedFromInboxFailed);
		};
	}, []);

	useEffect(() => {
		logoutIfNotAdminInAdminPath();
		getSocket().on('favoritesUpdated', setFavorites);
		return () => {
			getSocket().off('favoritesUpdated', setFavorites);
		};
	}, [context.globalState.auth.data.username]);

	return (
		<>
			<div id="root">
				{initialized ? (
					<>
						<Suspense fallback={<Loading />}>
							<Routes>
								<Route path="/login" element={<Login />} />
								<Route path="/system/*" element={<PrivateRoute component={<KMSystem />} />} />
								<Route path="*" element={<PrivateRoute component={<KMFrontend />} />} />
							</Routes>
						</Suspense>
						<ToastContainer icon={false} theme={'colored'} stacked={!is_touch_device()} />
					</>
				) : (
					<Loading />
				)}
			</div>
			<div id="modal">{context.globalState.modal.modal}</div>
		</>
	);
}

export default App;

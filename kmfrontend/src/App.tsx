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
import { displayMessage } from './utils/tools';

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

	useEffect(() => {
		isAlreadyLogged(context.globalDispatch).then(() => {
			if (
				location.pathname &&
				location.pathname !== '/' &&
				!location.pathname.includes('/public') &&
				context.globalState.auth.data.role &&
				context.globalState.auth.data.role !== 'admin'
			) {
				displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
				logout(context.globalDispatch);
			}
			setInitialized(true);
			getSocket().on('settingsUpdated', setSettingsStore);
			getSocket().on('favoritesUpdated', setFavorites);
			getSocket().on('noFreeSpace', warningNoFreeSpace);
		});
		return () => {
			getSocket().off('settingsUpdated', setSettingsStore);
			getSocket().off('favoritesUpdated', setFavorites);
			getSocket().off('noFreeSpace', warningNoFreeSpace);
		};
	}, []);

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
						<ToastContainer icon={false} theme={'colored'} />
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

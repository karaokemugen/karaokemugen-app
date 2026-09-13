import '../../styles/start/Start.scss';
import '../../styles/start/SetupPage.scss';

import { faLink, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useContext, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';

import logo from '../../../assets/Logo-final-fond-transparent.png';
import GlobalContext from '../../../store/context';
import SetupPageStats from './SetupPageStats';
import SetupPageUser from './SetupPageUser';
import Timeline from '../../components/generic/TimeLine';
import SetupPageSongs from './SetupPageSongs';
import SetupPageMedias from './SetupPageMedias';
import SetupPageRemoteAccess from './SetupPageRemoteAccess';
import SetupPageFinish from './SetupPageFinish';
import SetupPageCollections from './SetupPageCollections';

function SetupPage() {
	const context = useContext(GlobalContext);
	const location = useLocation();

	const status = useMemo(() => {
		if (location.pathname.endsWith('/user')) {
			return 'user';
		} else if (
			location.pathname.endsWith('/songs') ||
			location.pathname.endsWith('/medias') ||
			location.pathname.endsWith('/collections')
		) {
			return 'songs';
		} else if (
			location.pathname.endsWith('/remote') ||
			location.pathname.endsWith('/stats') ||
			location.pathname.endsWith('/collections')
		) {
			return 'online';
		} else {
			return 'finish';
		}
	}, [location.pathname]);

	const nodes = [
		{
			title: i18next.t('SETUP_PAGE.TIMELINE.USER_ACCOUNT'),
			dataIndex: 'user',
		},
		{
			title: i18next.t('SETUP_PAGE.TIMELINE.SONGS'),
			dataIndex: 'songs',
		},
		{
			title: i18next.t('SETUP_PAGE.TIMELINE.ONLINE'),
			dataIndex: 'online',
		},
	];

	return (
		<div className="start-page">
			<div className="wrapper setup">
				<div className="logo">
					<img src={logo} alt="Logo Karaoke Mugen" />
				</div>
				<div className="title">{i18next.t('SETUP_PAGE.TITLE')}</div>
				<div className="aside">
					<nav>
						<ul>
							<li>
								<a href="https://mugen.karaokes.moe/contact.html">
									<FontAwesomeIcon icon={faPencilAlt} />
									{i18next.t('WELCOME_PAGE.CONTACT')}
								</a>
							</li>
							<li>
								<a href="https://mugen.karaokes.moe/">
									<FontAwesomeIcon icon={faLink} />
									{i18next.t('WELCOME_PAGE.SITE')}
								</a>
							</li>
						</ul>
					</nav>
				</div>
				<div className="timeline">
					<Timeline nodes={nodes} status={status} />
				</div>
				<div className="main">
					<Routes>
						<Route path="/stats" element={<SetupPageStats />} />
						<Route path="/user" element={<SetupPageUser />} />
						<Route path="/songs" element={<SetupPageSongs />} />
						<Route path="/medias" element={<SetupPageMedias />} />
						<Route path="/remote" element={<SetupPageRemoteAccess />} />
						<Route path="/ending" element={<SetupPageFinish />} />
						<Route path="/collections" element={<SetupPageCollections />} />
						<Route
							path="*"
							element={
								<Navigate
									to={
										context?.globalState.settings.data.user.login !== 'admin'
											? '/setup/songs'
											: '/setup/user'
									}
								/>
							}
						/>
					</Routes>
				</div>
			</div>
		</div>
	);
}

export default SetupPage;

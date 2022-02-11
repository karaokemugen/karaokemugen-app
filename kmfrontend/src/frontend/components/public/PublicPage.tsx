import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { DBPLC } from '../../../../../src/lib/types/database/playlist';

import { PublicPlayerState } from '../../../../../src/types/state';
import nanamiSingingPng from '../../../assets/nanami-sing.png';
import nanamiSingingWebP from '../../../assets/nanami-sing.webp';
import { setFilterValue, setPlaylistInfoLeft, setPlaylistInfoRight } from '../../../store/actions/frontendContext';
import { closeModal, showModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { displayMessage, nonStandardPlaylists, secondsTimeSpanToHMS } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { View } from '../../types/view';
import KmAppBodyDecorator from '../decorators/KmAppBodyDecorator';
import KmAppHeaderDecorator from '../decorators/KmAppHeaderDecorator';
import KmAppWrapperDecorator from '../decorators/KmAppWrapperDecorator';
import KaraDetail from '../karas/KaraDetail';
import Playlist from '../karas/Playlist';
import VersionSelector from '../karas/VersionSelector';
import ClassicModeModal from '../modals/ClassicModeModal';
import PollModal from '../modals/PollModal';
import ProfilModal from '../modals/ProfilModal';
import UsersModal from '../modals/UsersModal';
import PlayerBox from './PlayerBox';
import PublicHeader from './PublicHeader';
import PublicHomepage from './PublicHomepage';
import TagsList from './TagsList';

let timer: any;
let timerFilter: any;

function PublicPage() {
	const context = useContext(GlobalContext);
	const location = useLocation();
	const navigate = useNavigate();

	const [isPollActive, setPollActive] = useState(false);
	const [classicModeModal, setClassicModeModal] = useState(false);
	const [view, setView] = useState<View>('home');
	const [tagType, setTagType] = useState<number>();
	const [kara, setKara] = useState<KaraElement>();
	const [playerStopping, setPlayerStopping] = useState(false);
	const [playerStopped, setPlayerStopped] = useState(false);
	const [top, setTop] = useState('0');
	const [bottom, setBottom] = useState('0');
	const [searchValue, setSearchValue] = useState<string>();
	const [searchCriteria, setSearchCriteria] = useState<'year' | 'tag'>();
	const [publicVisible, setPublicVisible] = useState(false);
	const [currentVisible, setCurrentVisible] = useState(false);
	const [indexKaraDetail, setIndexKaraDetail] = useState<number>();
	const [searchType, setSearchType] = useState<'search' | 'recent' | 'requested'>('search');

	const changeView = async (view: View, tagType?: number, searchValue?: string, searchCriteria?: 'year' | 'tag') => {
		let route;
		let searchType: 'search' | 'recent' | 'requested' = 'search';
		if (view === 'home' || context?.globalState.settings.data.config.Frontend?.Mode === 0) {
			route = '/public';
			if (!context.globalState.frontendContext.playlistInfoLeft)
				setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.library);
		} else if (view === 'tag') {
			tagType = tagType !== undefined ? tagType : tagType;
			route = `/public/tags/${tagType}`;
			if (!context.globalState.frontendContext.playlistInfoLeft)
				setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.library);
		} else if (view === 'favorites') {
			setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.favorites);
			route = '/public/favorites';
		} else if (view === 'requested') {
			setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.library);
			searchType = 'requested';
			route = '/public/search/requested';
		} else if (view === 'history') {
			setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.library);
			route = '/public/search/history';
		} else if (view === 'search') {
			setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.library);
			searchType = 'search';
			route = '/public/search';
		} else if (view === 'publicPlaylist') {
			setPlaylistInfoLeft(context.globalDispatch, context.globalState.settings.data.state.publicPlaid);
			route = `/public/playlist/${context.globalState.settings.data.state.publicPlaid}`;
		} else if (view === 'currentPlaylist') {
			setPlaylistInfoLeft(context.globalDispatch, context.globalState.settings.data.state.currentPlaid);
			route = `/public/playlist/${context.globalState.settings.data.state.currentPlaid}`;
		}
		if (indexKaraDetail === undefined && context?.globalState.settings.data.config.Frontend?.Mode !== 0) {
			setFilterValue(
				context.globalDispatch,
				'',
				'left',
				context.globalState.frontendContext.playlistInfoLeft.plaid
			);
		}
		setView(view);
		setTagType(tagType);
		setSearchValue(searchValue);
		setSearchCriteria(searchCriteria);
		setSearchType(searchType);
		setKara(undefined);
		navigate(route);
	};

	const initView = async () => {
		await refreshPoll();
		if (context?.globalState.settings.data.config?.Frontend?.Mode !== 0) await getPlaylistList();
		if (location.pathname.includes('/public/search/requested')) {
			changeView('requested');
		}
		if (location.pathname.includes('/public/search/history')) {
			changeView('history');
		} else if (location.pathname.includes('/public/search')) {
			changeView('search');
		} else if (location.pathname.includes('/public/favorites')) {
			changeView('favorites');
		} else if (location.pathname.includes('/public/tags')) {
			const tagType = Number(location.pathname.substring(location.pathname.lastIndexOf('/') + 1));
			changeView('tag', tagType);
		} else if (location.pathname.includes('/public/playlist')) {
			const idPlaylist = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
			if (idPlaylist === context.globalState.settings.data.state.publicPlaid) {
				changeView('publicPlaylist');
			} else if (idPlaylist === context.globalState.settings.data.state.currentPlaid) {
				changeView('currentPlaylist');
			}
		}
	};

	const publicPlaylistUpdated = async (plaid: string) => {
		if (plaid !== context.globalState.settings.data.state.publicPlaid) {
			await getPlaylistList();
			setSettings(context.globalDispatch);
			setPlaylistInfoRight(context.globalDispatch, plaid);
		}
	};

	const playlistInfoUpdated = (plaid: string) => {
		getPlaylistList();
		if (context.globalState.frontendContext.playlistInfoLeft.plaid === plaid)
			setPlaylistInfoLeft(context.globalDispatch, plaid);
		if (context.globalState.frontendContext.playlistInfoRight.plaid === plaid)
			setPlaylistInfoRight(context.globalDispatch, plaid);
	};

	const getPlaylistList = async () => {
		try {
			const playlistsList = await commandBackend('getPlaylists');
			playlistsList.forEach(playlist => {
				if (playlist.flag_public) {
					setPublicVisible(playlist.flag_visible);
				}
				if (playlist.flag_current) {
					setCurrentVisible(playlist.flag_visible);
				}
			});
		} catch (e) {
			// already display
		}
	};

	const refreshPoll = async () => {
		try {
			const poll = await commandBackend('getPoll');
			if (poll) {
				setPollActive(true);
			}
		} catch (err) {
			if ((err as { code: number }).code === 425) {
				setPollActive(false);
			}
		}
	};

	const songPollStarted = () => {
		if (context.globalState.auth.isAuthenticated) {
			setPollActive(true);
			showModal(context.globalDispatch, <PollModal />);
		}
	};

	const songPollEnded = () => {
		setPollActive(false);
		closeModal(context.globalDispatch);
	};

	const songPollResult = (data: any) => {
		displayMessage('success', i18next.t('POLLENDED', { kara: data.kara.substring(0, 100), votes: data.votes }));
	};

	const adminMessage = (data: any) =>
		displayMessage(
			'info',
			<div>
				<label>{i18next.t('CL_INFORMATIVE_MESSAGE')}</label> <br />
				{data.message}
			</div>,
			data.duration
		);

	const userSongPlaysIn = (data: DBPLCInfo) => {
		if (data && data.username === context.globalState.auth.data.username) {
			const playTime = new Date(Date.now() + data.time_before_play * 1000);
			const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			const beforePlayTime = secondsTimeSpanToHMS(data.time_before_play, 'hm');
			displayMessage(
				'info',
				i18next.t('USER_SONG_PLAYS_IN', {
					kara: buildKaraTitle(context.globalState.settings.data, data, true),
					time: beforePlayTime,
					date: playTimeDate,
				})
			);
		}
	};

	const nextSong = (data: DBPLC) => {
		if (data && data.flag_visible && !playerStopping) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				displayMessage(
					'info',
					<div>
						<label>{i18next.t('NEXT_SONG_MESSAGE')}</label>
						<br />
						{buildKaraTitle(context.globalState.settings.data, data, true)}
					</div>
				);
			}, 500);
		}
	};

	const displayClassicModeModal = (data: PublicPlayerState) => {
		if (data.stopping !== undefined) setPlayerStopping(data.stopping);
		if (data.playerStatus === 'stop') setPlayerStopped(true);
		else if (typeof data.playerStatus === 'string') setPlayerStopped(false);
		if (playerStopped && data.currentRequester === context.globalState.auth.data.username && !classicModeModal) {
			showModal(context.globalDispatch, <ClassicModeModal />);
			setClassicModeModal(true);
		} else if (!playerStopped && classicModeModal) {
			closeModal(context.globalDispatch);
			setClassicModeModal(false);
		}
	};

	const openKara = (kara: KaraElement, _plaid: string, indexKaraDetail: number) => {
		setKara(kara);
		setIndexKaraDetail(indexKaraDetail);
	};

	const changeFilterValue = e => {
		if (timerFilter) clearTimeout(timerFilter);
		timerFilter = setTimeout(
			() =>
				setFilterValue(
					context.globalDispatch,
					e.target.value,
					'left',
					context.globalState.frontendContext.playlistInfoLeft.plaid
				),
			1000
		);
	};

	const publicFragment = () => (
		<>
			<KmAppHeaderDecorator mode="public">
				<button
					className="btn"
					type="button"
					onClick={() => changeView(view === 'search' && searchCriteria ? 'tag' : 'home')}
				>
					<i className="fas fa-arrow-left" />
				</button>
				<div className="plSearch">
					<input
						placeholder={`\uF002 ${i18next.t('SEARCH')}`}
						type="text"
						defaultValue={context.globalState.frontendContext.filterValue1}
						onChange={changeFilterValue}
					/>
				</div>
				{isPollActive ? (
					<button
						className="btn btn-default showPoll"
						onClick={() => showModal(context.globalDispatch, <PollModal />)}
					>
						<i className="fas fa-chart-line" />
					</button>
				) : null}
			</KmAppHeaderDecorator>

			<KmAppBodyDecorator
				mode={context?.globalState.settings.data.config?.Frontend?.Mode}
				extraClass="JustPlaylist"
			>
				{view === 'tag' ? (
					<TagsList tagType={tagType} changeView={changeView} />
				) : (
					<Playlist
						scope="public"
						side={'left'}
						openKara={openKara}
						searchValue={searchValue}
						searchCriteria={searchCriteria}
						indexKaraDetail={indexKaraDetail}
						clearIndexKaraDetail={() => setIndexKaraDetail(undefined)}
						searchType={
							location.pathname.includes('/public/search/requested')
								? 'requested'
								: location.pathname.includes('/public/search/history')
								? 'recent'
								: searchType
						}
					/>
				)}
			</KmAppBodyDecorator>
		</>
	);

	useEffect(() => {
		if (indexKaraDetail !== undefined) {
			setPlaylistInfoLeft(context.globalDispatch, context.globalState.frontendContext.playlistInfoLeft.plaid);
			// Show VersionSelector if user has parents/children enabled, that the kara have children and that it is
			// not a PLC entry.
			if (context.globalState.settings.data.user.flag_parentsonly && !kara.plcid && kara.children?.length > 0) {
				navigate(`/public/karaokes/${kara.kid}`);
			} else {
				navigate(`/public/karaoke/${kara.kid}`);
			}
		}
	}, [indexKaraDetail]);

	useEffect(() => {
		getSocket().on('publicPlaylistUpdated', publicPlaylistUpdated);
		return () => {
			getSocket().off('publicPlaylistUpdated', publicPlaylistUpdated);
		};
	}, [context.globalState.settings.data.state.publicPlaid]);

	useEffect(() => {
		getSocket().on('playlistInfoUpdated', playlistInfoUpdated);
		return () => {
			getSocket().off('playlistInfoUpdated', playlistInfoUpdated);
		};
	}, [
		context.globalState.frontendContext?.playlistInfoLeft?.plaid,
		context.globalState.frontendContext?.playlistInfoRight?.plaid,
	]);

	useEffect(() => {
		initView();
		getSocket().on('playerStatus', displayClassicModeModal);
		getSocket().on('songPollStarted', songPollStarted);
		getSocket().on('songPollEnded', songPollEnded);
		getSocket().on('songPollResult', songPollResult);
		getSocket().on('adminMessage', adminMessage);
		getSocket().on('userSongPlaysIn', userSongPlaysIn);
		getSocket().on('nextSong', nextSong);
		return () => {
			getSocket().off('playerStatus', displayClassicModeModal);
			getSocket().off('songPollStarted', songPollStarted);
			getSocket().off('songPollEnded', songPollEnded);
			getSocket().off('songPollResult', songPollResult);
			getSocket().off('adminMessage', adminMessage);
			getSocket().off('userSongPlaysIn', userSongPlaysIn);
			getSocket().off('nextSong', nextSong);
		};
	}, []);

	if (
		context?.globalState.settings.data.config?.Frontend?.Mode !== 2 &&
		location.pathname.includes('/public/search')
	) {
		changeView('currentPlaylist');
	}
	return context?.globalState.settings.data.config.Frontend?.Mode === 0 ? (
		<div
			style={{
				top: '25%',
				position: 'relative',
				textAlign: 'center',
			}}
		>
			<picture>
				<source type="image/webp" srcSet={nanamiSingingWebP} />
				<source type="image/png" srcSet={nanamiSingingPng} />
				<img
					alt="Nanami is singing!"
					style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)' }}
					src={nanamiSingingPng}
				/>
			</picture>
			<div style={{ fontSize: '30px', padding: '10px' }}>{i18next.t('WEBAPPMODE_CLOSED_MESSAGE')}</div>
		</div>
	) : (
		<>
			<PublicHeader
				openModal={(type: string) => navigate(`/public/${type}`)}
				onResize={top => setTop(top)}
				changeView={changeView}
				currentView={view}
				currentVisible={currentVisible}
				publicVisible={publicVisible}
			/>
			<PlayerBox
				mode="fixed"
				show={view !== 'home'}
				currentVisible={currentVisible}
				goToCurrentPL={() => changeView('currentPlaylist')}
				onResize={bottom => setBottom(bottom)}
			/>
			<KmAppWrapperDecorator
				single
				top={top}
				bottom={bottom}
				view={view}
				hmagrin={
					!['favorites', 'publicPlaylist', 'currentPlaylist', 'tag', 'search'].includes(view) &&
					kara === undefined
				}
			>
				<Routes>
					<Route
						path="/user"
						element={<ProfilModal scope="public" closeProfileModal={() => navigate(-1)} />}
					/>
					<Route path="/users" element={<UsersModal scope="public" closeModal={() => navigate(-1)} />} />
					<Route
						path="/karaoke/:kid"
						element={
							<KaraDetail
								kid={kara?.kid}
								playlistcontentId={kara?.plcid}
								scope="public"
								plaid={context.globalState.frontendContext.playlistInfoLeft?.plaid}
								closeOnPublic={() => {
									navigate(-1);
									setKara(undefined);
								}}
								changeView={changeView}
							/>
						}
					/>
					<Route
						path="/karaokes/:kid"
						element={
							<VersionSelector
								kid={kara?.kid}
								closeOnPublic={() => {
									navigate(-1);
									setKara(undefined);
								}}
								changeView={changeView}
								scope="public"
							/>
						}
					/>
					<Route path="/search/*" element={publicFragment()} />
					<Route path="/playlist/:plaid" element={publicFragment()} />
					<Route path="/favorites" element={publicFragment()} />
					<Route path="/tags/:tagType" element={publicFragment()} />
					<Route
						path="*"
						element={
							<PublicHomepage
								changeView={changeView}
								toggleKaraDetail={openKara}
								activePoll={isPollActive}
								currentVisible={currentVisible}
								publicVisible={publicVisible}
								openPoll={() => showModal(context.globalDispatch, <PollModal />)}
							/>
						}
					/>
				</Routes>
			</KmAppWrapperDecorator>
		</>
	);
}

export default PublicPage;

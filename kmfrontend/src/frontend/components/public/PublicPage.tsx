import i18next from 'i18next';
import { merge } from 'lodash';
import { useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import { DBPLC } from '../../../../../src/lib/types/database/playlist';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';
import nanamiSingingPng from '../../../assets/nanami-sing.png';
import nanamiSingingWebP from '../../../assets/nanami-sing.webp';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from '../../../store/actions/frontendContext';
import { closeModal, showModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { displayMessage, nonStandardPlaylists, secondsTimeSpanToHMS } from '../../../utils/tools';
import KmAppWrapperDecorator from '../decorators/KmAppWrapperDecorator';
import KaraDetail from '../karas/KaraDetail';
import VersionSelector from '../karas/VersionSelector';
import ClassicModeModal from '../modals/ClassicModeModal';
import PollModal from '../modals/PollModal';
import ProfilModal from '../modals/ProfilModal';
import UsersModal from '../modals/UsersModal';
import NotfoundPage from '../NotfoundPage';
import PlayerBox from './PlayerBox';
import PublicHeader from './PublicHeader';
import PublicHomepage from './PublicHomepage';
import PublicList from './PublicList';
import QuizPage from './QuizPage';

let timer: any;

function PublicPage() {
	const context = useContext(GlobalContext);
	const location = useLocation();
	const params = useParams();
	const navigate = useNavigate();

	const [isPollActive, setPollActive] = useState(false);
	const [classicModeModal, setClassicModeModal] = useState(false);
	const [playerStopping, setPlayerStopping] = useState(false);
	const [playerStopped, setPlayerStopped] = useState(false);
	const [top, setTop] = useState('0px');
	const [bottom, setBottom] = useState('0px');
	const [publicVisible, setPublicVisible] = useState(false);
	const [currentVisible, setCurrentVisible] = useState(false);
	const [statusPlayer, setStatusPlayer] = useState<PublicPlayerState>();
	const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistElem>();

	const publicPlaylistUpdated = async (plaid: string) => {
		if (plaid !== context.globalState.settings.data.state.publicPlaid) {
			await getPlaylistList();
			setSettings(context.globalDispatch);
			setPlaylistInfoRight(context.globalDispatch, plaid);
		}
	};

	const playlistInfoUpdated = (plaid: string) => {
		getPlaylistList();
		if (context.globalState.frontendContext.playlistInfoLeft?.plaid === plaid)
			setPlaylistInfoLeft(context.globalDispatch, plaid);
		if (context.globalState.frontendContext.playlistInfoRight?.plaid === plaid)
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
					setCurrentPlaylist(playlist);
					setCurrentVisible(playlist.flag_visible);
				}
			});
		} catch (_) {
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
			if ((err as { code: number })?.code === 425) {
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

	const playerUpdate = (data: PublicPlayerState) => {
		setStatusPlayer(oldState => {
			const state = { ...oldState };
			return merge(state, data);
		});
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

	const getPlayerStatus = async () => {
		try {
			const result = await commandBackend('getPlayerStatus');
			playerUpdate(result);
		} catch (_) {
			// already display
		}
	};

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
		if (context.globalState.auth.isAuthenticated) getPlayerStatus();
		if (context.globalState.settings.data.state.songPoll) refreshPoll();
		if (context?.globalState.settings.data.config?.Frontend?.Mode !== 0) getPlaylistList();
		getSocket().on('playerStatus', playerUpdate);
		getSocket().on('songPollStarted', songPollStarted);
		getSocket().on('songPollEnded', songPollEnded);
		getSocket().on('songPollResult', songPollResult);
		getSocket().on('adminMessage', adminMessage);
		getSocket().on('userSongPlaysIn', userSongPlaysIn);
		getSocket().on('nextSong', nextSong);
		return () => {
			getSocket().off('playerStatus', playerUpdate);
			getSocket().off('songPollStarted', songPollStarted);
			getSocket().off('songPollEnded', songPollEnded);
			getSocket().off('songPollResult', songPollResult);
			getSocket().off('adminMessage', adminMessage);
			getSocket().off('userSongPlaysIn', userSongPlaysIn);
			getSocket().off('nextSong', nextSong);
		};
	}, []);

	if (
		context?.globalState.settings.data.config?.Frontend?.Mode === 0 &&
		location.pathname.includes('/public/search')
	) {
		navigate('/public/playlist/current', { replace: true });
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
				onResize={top => setTop(top)}
				currentVisible={currentVisible}
				publicVisible={publicVisible}
				statusPlayer={statusPlayer}
				currentPlaylist={currentPlaylist}
			/>
			{!context.globalState.settings.data.state.quiz.running ? (
				<PlayerBox mode="fixed" currentVisible={currentVisible} onResize={bottom => setBottom(bottom)} />
			) : null}
			<KmAppWrapperDecorator
				single
				top={top}
				bottom={bottom}
				hmagrin={
					!(
						location.pathname.startsWith('/public/favorites') &&
						location.pathname.startsWith('/public/animelist') &&
						location.pathname.startsWith('/public/playlist') &&
						location.pathname.startsWith('/public/search') &&
						location.pathname.startsWith('/public/kara') &&
						location.pathname.startsWith('/public/plc')
					)
				}
			>
				<Routes>
					<Route
						path="/user"
						element={<ProfilModal scope="public" closeProfileModal={() => navigate(-1)} />}
					/>
					<Route path="/users" element={<UsersModal scope="public" closeModal={() => navigate(-1)} />} />
					{!context.globalState.settings.data.state.quiz.running ? ( // Disable routes
						<>
							<Route
								path="/karaoke/:kid"
								element={
									<KaraDetail kid={params.kid} scope="public" closeOnPublic={() => navigate(-1)} />
								}
							/>
							<Route
								path="/plc/:plcid"
								element={
									<KaraDetail
										playlistcontentId={parseInt(params.plcid)}
										scope="public"
										closeOnPublic={() => navigate(-1)}
									/>
								}
							/>
							<Route
								path="/karaokes/:kid"
								element={<VersionSelector kid={params.kid} scope="public" />}
							/>
							<Route
								path="/search"
								element={
									<PublicList
										sort="search"
										poll={isPollActive}
										plaid={nonStandardPlaylists.library}
									/>
								}
							/>
							<Route path="/search/recent" element={<PublicList sort="recent" poll={isPollActive} />} />
							<Route
								path="/search/requested"
								element={<PublicList sort="requested" poll={isPollActive} />}
							/>
							<Route path="/search/tag/:tid" element={<PublicList sort="search" poll={isPollActive} />} />
							<Route
								path="/search/year/:year"
								element={<PublicList sort="search" poll={isPollActive} />}
							/>
							<Route path="/tags/:tagType" element={<PublicList sort="search" poll={isPollActive} />} />
							<Route
								path="/playlist/current"
								element={
									<Navigate
										to={`/public/playlist/${context.globalState.settings.data.state.currentPlaid}`}
										replace={true}
									/>
								}
							/>
							<Route
								path="/playlist/public"
								element={
									<Navigate
										to={`/public/playlist/${context.globalState.settings.data.state.publicPlaid}`}
										replace={true}
									/>
								}
							/>
							<Route path="/playlist/:plaid" element={<PublicList sort="search" poll={isPollActive} />} />
							<Route
								path="/favorites"
								element={
									<PublicList
										sort="search"
										poll={isPollActive}
										plaid={nonStandardPlaylists.favorites}
									/>
								}
							/>
							<Route
								path="/animelist"
								element={
									<PublicList
										sort="search"
										poll={isPollActive}
										plaid={nonStandardPlaylists.animelist}
									/>
								}
							/>
							<Route path="/tags/:tagType" element={<PublicList sort="search" poll={isPollActive} />} />
						</>
					) : null}
					<Route path="/quiz" element={<QuizPage />} />
					<Route
						index={true}
						element={
							context.globalState.settings.data.state.quiz.running ? (
								<Navigate to="/public/quiz" />
							) : (
								<PublicHomepage
									activePoll={isPollActive}
									currentVisible={currentVisible}
									publicVisible={publicVisible}
									openPoll={() => showModal(context.globalDispatch, <PollModal />)}
								/>
							)
						}
					/>
					<Route path="*" element={<NotfoundPage />} />
				</Routes>
			</KmAppWrapperDecorator>
		</>
	);
}

export default PublicPage;

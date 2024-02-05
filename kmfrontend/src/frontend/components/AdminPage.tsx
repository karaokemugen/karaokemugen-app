import i18next from 'i18next';
import { debounce } from 'lodash';
import { createElement, useCallback, useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Route, Routes } from 'react-router';

import { useSearchParams } from 'react-router-dom';
import TasksEvent from '../../TasksEvent';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from '../../store/actions/frontendContext';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { commandBackend, getSocket } from '../../utils/socket';
import { decodeCriteriaReason, displayMessage, is_touch_device, nonStandardPlaylists } from '../../utils/tools';
import { KaraElement } from '../types/kara';
import AdminHeader from './AdminHeader';
import KmAppBodyDecorator from './decorators/KmAppBodyDecorator';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import PlaylistMainDecorator from './decorators/PlaylistMainDecorator';
import KaraDetail from './karas/KaraDetail';
import Playlist from './karas/Playlist';
import ProgressBar from './karas/ProgressBar';
import QuizModal from './modals/QuizModal';
import Tutorial from './modals/Tutorial';
import Options from './options/Options';

interface IProps {
	powerOff: (() => void) | undefined;
}

function AdminPage(props: IProps) {
	const context = useContext(GlobalContext);
	const [searchParams] = useSearchParams();
	const [searchMenuOpenLeft, setSearchMenuOpenLeft] = useState(false);
	const [searchMenuOpenRight, setSearchMenuOpenRight] = useState(false);
	const [playlistList, setPlaylistList] = useState([]);
	const [quizRanking, setQuizRanking] = useState(false);

	const operatorNotificationInfo = (data: { code: string; data: string }) =>
		displayMessage('info', i18next.t(data.code, { data: data }));
	const operatorNotificationError = (data: { code: string; data: string }) =>
		displayMessage('error', i18next.t(data.code, { data: data }));
	const operatorNotificationWarning = (data: { code: string; data: string }) =>
		displayMessage('warning', i18next.t(data.code, { data: data }));
	const operatorNotificationSuccess = (data: { code: string; data: string }) =>
		displayMessage('success', i18next.t(data.code, { data: data }));

	const playlistInfoUpdated = useCallback(
		debounce(
			async (plaid: string) => {
				await getPlaylistList();
				if (context.globalState.frontendContext?.playlistInfoLeft?.plaid === plaid)
					setPlaylistInfoLeft(context.globalDispatch, plaid);
				if (context.globalState.frontendContext?.playlistInfoRight?.plaid === plaid)
					setPlaylistInfoRight(context.globalDispatch, plaid);
			},
			300,
			{ maxWait: 1000 }
		),
		[
			context.globalState.frontendContext?.playlistInfoLeft?.plaid,
			context.globalState.frontendContext?.playlistInfoRight?.plaid,
		]
	);

	const toggleSearchMenuLeft = () => {
		setSearchMenuOpenLeft(!searchMenuOpenLeft);
	};

	const toggleSearchMenuRight = () => {
		setSearchMenuOpenRight(!searchMenuOpenRight);
	};

	const putPlayerCommando = (event: any) => {
		const namecommand = event.currentTarget.getAttribute('data-namecommand');
		let data: { command: string; options?: any };
		if (namecommand === 'setVolume') {
			let volume = parseInt(event.currentTarget.value);
			const base = 100;
			const pow = 0.76;
			volume = Math.pow(volume, pow) / Math.pow(base, pow);
			volume = volume * base;
			data = {
				command: namecommand,
				options: volume,
			};
		} else if (namecommand === 'setPitch' || namecommand === 'setSpeed') {
			data = {
				command: namecommand,
				options: parseInt(event.currentTarget.value),
			};
		} else if (namecommand === 'goTo') {
			data = {
				command: namecommand,
				options: 0,
			};
		} else {
			data = {
				command: namecommand,
			};
		}
		commandBackend('sendPlayerCommand', data).catch(() => {});
	};

	const getPlaylistList = async () => {
		const playlistList: PlaylistElem[] = await commandBackend('getPlaylists');
		let kmStats;
		try {
			kmStats = await commandBackend('getStats');
		} catch (e) {
			kmStats = {
				karas: 0,
			};
		}
		playlistList.push({
			plaid: nonStandardPlaylists.favorites,
			name: i18next.t('PLAYLISTS.FAVORITES'),
		});
		if (context.globalState.settings.data.user.anime_list_to_fetch) {
			playlistList.push({
				plaid: nonStandardPlaylists.animelist,
				name: i18next.t('PLAYLISTS.ANIME_LIST'),
			});
		}
		playlistList.push({
			plaid: nonStandardPlaylists.library,
			name: i18next.t('PLAYLISTS.LIBRARY'),
			karacount: kmStats.karas,
		});
		setPlaylistList(playlistList);
	};

	const openKara = async (kara: KaraElement) => {
		const reason = [];
		if (kara.criterias) {
			await Promise.all(
				kara.criterias.map(async criteria =>
					reason.push(await decodeCriteriaReason(context.globalState.settings.data, criteria))
				)
			);
		}
		showModal(
			context.globalDispatch,
			<KaraDetail kid={kara.kid} playlistcontentId={kara.plcid} scope="admin" criteriaLabel={reason.join(' ')} />
		);
	};

	useEffect(() => {
		const quizMode = searchParams.get('quizMode');
		if (quizMode) {
			showModal(context.globalDispatch, <QuizModal />);
		}
	}, []);

	useEffect(() => {
		setQuizRanking(context.globalState.settings.data.state.quiz.running);
	}, [context.globalState.settings.data.state.quiz.running]);

	useEffect(() => {
		getSocket().on('playlistInfoUpdated', playlistInfoUpdated);
		return () => {
			getSocket().off('playlistInfoUpdated', playlistInfoUpdated);
		};
	}, [playlistInfoUpdated]);

	useEffect(() => {
		if (context.globalState.auth.isAuthenticated) {
			getPlaylistList();
		}
		if (!context?.globalState.settings.data.user?.flag_tutorial_done) {
			ReactDOM.render(createElement(Tutorial), document.getElementById('tuto'));
		}
		getSocket().on('playlistsUpdated', getPlaylistList);
		getSocket().on('operatorNotificationInfo', operatorNotificationInfo);
		getSocket().on('operatorNotificationError', operatorNotificationError);
		getSocket().on('operatorNotificationWarning', operatorNotificationWarning);
		getSocket().on('operatorNotificationSuccess', operatorNotificationSuccess);
		return () => {
			getSocket().off('playlistsUpdated', getPlaylistList);
			getSocket().off('operatorNotificationInfo', operatorNotificationInfo);
			getSocket().off('operatorNotificationError', operatorNotificationError);
			getSocket().off('operatorNotificationWarning', operatorNotificationWarning);
			getSocket().off('operatorNotificationSuccess', operatorNotificationSuccess);
		};
	}, []);

	return (
		<>
			<KmAppWrapperDecorator>
				<AdminHeader
					powerOff={props.powerOff}
					putPlayerCommando={putPlayerCommando}
					currentPlaylist={playlistList.filter(playlistElem => playlistElem.flag_current)[0]}
					updateQuizRanking={() => setQuizRanking(!quizRanking)}
				/>
				<ProgressBar />
				<KmAppBodyDecorator mode="admin">
					{playlistList.length > 0 ? (
						<Routes>
							<Route path="/options/*" element={<Options />} />
							<Route
								path="*"
								element={
									<>
										<PlaylistMainDecorator>
											<Playlist
												scope="admin"
												side={'left'}
												toggleSearchMenu={toggleSearchMenuLeft}
												searchMenuOpen={searchMenuOpenLeft}
												playlistList={playlistList}
												openKara={openKara}
												quizRanking={quizRanking}
											/>
											<Playlist
												scope="admin"
												side={'right'}
												toggleSearchMenu={toggleSearchMenuRight}
												searchMenuOpen={searchMenuOpenRight}
												playlistList={playlistList}
												openKara={openKara}
											/>
										</PlaylistMainDecorator>
										{!is_touch_device() ? (
											<TasksEvent limit={3} styleTask="bottom-admin-wrapper" dummyTask={true} />
										) : null}
									</>
								}
							/>
						</Routes>
					) : null}
				</KmAppBodyDecorator>
			</KmAppWrapperDecorator>
			{context.globalState.frontendContext.futurTime ? (
				<div id="futurTime" className="futurTime">
					{context.globalState.frontendContext.futurTime}
				</div>
			) : null}
		</>
	);
}

export default AdminPage;

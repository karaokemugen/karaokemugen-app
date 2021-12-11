import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';

import { DBKaraTag, DBYear } from '../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../src/lib/types/database/tag';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from '../../store/actions/frontendContext';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { getTagInLocale } from '../../utils/kara';
import { commandBackend, getSocket } from '../../utils/socket';
import { decodeCriteriaReason, displayMessage } from '../../utils/tools';
import { KaraElement } from '../types/kara';
import { Tag } from '../types/tag';
import AdminHeader from './AdminHeader';
import KmAppBodyDecorator from './decorators/KmAppBodyDecorator';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import PlaylistMainDecorator from './decorators/PlaylistMainDecorator';
import KaraDetail from './karas/KaraDetail';
import Playlist from './karas/Playlist';
import ProgressBar from './karas/ProgressBar';
import AdminMessageModal from './modals/AdminMessageModal';
import Options from './options/Options';

interface IProps {
	powerOff: (() => void) | undefined;
}

function AdminPage(props: IProps) {
	const context = useContext(GlobalContext);
	const [searchMenuOpenLeft, setSearchMenuOpenLeft] = useState(false);
	const [searchMenuOpenRight, setSearchMenuOpenRight] = useState(false);
	const [playlistList, setPlaylistList] = useState([]);
	const [tags, setTags] = useState([]);

	const operatorNotificationInfo = (data: { code: string; data: string }) =>
		displayMessage('info', i18next.t(data.code, { data: data }));
	const operatorNotificationError = (data: { code: string; data: string }) =>
		displayMessage('error', i18next.t(data.code, { data: data }));
	const operatorNotificationWarning = (data: { code: string; data: string }) =>
		displayMessage('warning', i18next.t(data.code, { data: data }));

	const playlistInfoUpdated = async (plaid: string) => {
		await getPlaylistList();
		if (context.globalState.frontendContext.playlistInfoLeft.plaid === plaid)
			setPlaylistInfoLeft(context.globalDispatch, plaid);
		if (context.globalState.frontendContext.playlistInfoRight.plaid === plaid)
			setPlaylistInfoRight(context.globalDispatch, plaid);
	};

	const toggleSearchMenuLeft = () => {
		setSearchMenuOpenLeft(!searchMenuOpenLeft);
	};

	const toggleSearchMenuRight = () => {
		setSearchMenuOpenRight(!searchMenuOpenRight);
	};

	const adminMessage = () => {
		showModal(context.globalDispatch, <AdminMessageModal />);
	};

	const putPlayerCommando = (event: any) => {
		const namecommand = event.currentTarget.getAttribute('data-namecommand');
		let data;
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

	const parseTags = async () => {
		try {
			const response = await commandBackend('getTags');
			return response.content
				.filter((val: DBTag) => val.karacount !== null)
				.map((val: DBTag) => {
					return {
						value: val.tid,
						label: getTagInLocale(context.globalState.settings.data, val as unknown as DBKaraTag),
						type: val.types,
						karacount: val.karacount,
					};
				});
		} catch (e) {
			//already display
		}
	};

	const parseYears = async () => {
		const response = await commandBackend('getYears');
		return response.content.map((val: DBYear) => {
			return { value: val.year, label: val.year, type: [0], karacount: [{ type: 0, count: val.karacount }] };
		});
	};

	const addTags = async () => {
		try {
			const [tags, years] = await Promise.all([parseTags(), parseYears()]);
			setTags(tags.concat(years));
		} catch (e) {
			// already display
		}
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
			plaid: 'efe3687f-9e0b-49fc-a5cc-89df25a17e94',
			name: i18next.t('PLAYLISTS.FAVORITES'),
		});
		playlistList.push({
			plaid: '524de79d-10b2-49dc-90b1-597626d0cee8',
			name: i18next.t('PLAYLISTS.LIBRARY'),
			karacount: kmStats.karas,
		});
		setPlaylistList(playlistList);
	};

	const openKara = async (kara: KaraElement, idPlaylist: string) => {
		const reason = [];
		if (kara.criterias) {
			kara.criterias.map(async criteria =>
				reason.push(await decodeCriteriaReason(context.globalState.settings.data, criteria))
			);
		}
		showModal(
			context.globalDispatch,
			<KaraDetail
				kid={kara.kid}
				playlistcontentId={kara.plcid}
				scope="admin"
				plaid={idPlaylist}
				criteriaLabel={reason.join(', ')}
			/>
		);
	};

	useEffect(() => {
		getSocket().on('playlistInfoUpdated', playlistInfoUpdated);
		return () => {
			getSocket().off('playlistInfoUpdated', playlistInfoUpdated);
		};
	}, [context.globalState.frontendContext.playlistInfoLeft, context.globalState.frontendContext.playlistInfoRight]);

	useEffect(() => {
		if (context.globalState.auth.isAuthenticated) {
			getPlaylistList();
		}
		addTags();
		getSocket().on('playlistsUpdated', getPlaylistList);
		getSocket().on('operatorNotificationInfo', operatorNotificationInfo);
		getSocket().on('operatorNotificationError', operatorNotificationError);
		getSocket().on('operatorNotificationWarning', operatorNotificationWarning);
		return () => {
			getSocket().off('playlistsUpdated', getPlaylistList);
			getSocket().off('operatorNotificationInfo', operatorNotificationInfo);
			getSocket().off('operatorNotificationError', operatorNotificationError);
			getSocket().off('operatorNotificationWarning', operatorNotificationWarning);
		};
	}, []);

	return (
		<>
			<KmAppWrapperDecorator>
				<AdminHeader
					powerOff={props.powerOff}
					adminMessage={adminMessage}
					putPlayerCommando={putPlayerCommando}
					currentPlaylist={playlistList.filter(playlistElem => playlistElem.flag_current)[0]}
				/>
				<ProgressBar />
				<KmAppBodyDecorator mode="admin">
					{playlistList.length > 0 ? (
						<Routes>
							<Route path="/options/*" element={<Options />} />
							<Route
								path="*"
								element={
									<PlaylistMainDecorator>
										<Playlist
											scope="admin"
											side={'left'}
											tags={tags}
											toggleSearchMenu={toggleSearchMenuLeft}
											searchMenuOpen={searchMenuOpenLeft}
											playlistList={playlistList}
											openKara={openKara}
										/>
										<Playlist
											scope="admin"
											side={'right'}
											tags={tags}
											toggleSearchMenu={toggleSearchMenuRight}
											searchMenuOpen={searchMenuOpenRight}
											playlistList={playlistList}
											openKara={openKara}
										/>
									</PlaylistMainDecorator>
								}
							/>
						</Routes>
					) : null}
				</KmAppBodyDecorator>
			</KmAppWrapperDecorator>
		</>
	);
}

export default AdminPage;

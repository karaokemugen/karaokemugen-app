import i18next from 'i18next';
import React, { Component } from 'react';
import { Route, Switch } from 'react-router';

import { DBYear } from '../../../../src/lib/types/database/kara';
import { PublicPlayerState } from '../../../../src/types/state';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from '../../store/actions/frontendContext';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { getNavigatorLanguageIn3B } from '../../utils/isoLanguages';
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

interface IState {
	searchMenuOpen1: boolean;
	searchMenuOpen2: boolean;
	statusPlayer?: PublicPlayerState;
	currentSide: 'left' | 'right';
	playlistList: PlaylistElem[];
	// Workaround for Safari (forcedHeight on <Playlist> and onResize on <PlaylistMainDecorator>)
	// See PublicPage.tsx
	plHeight?: number;
	tags: Tag[];
}

class AdminPage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			searchMenuOpen1: false,
			searchMenuOpen2: false,
			currentSide: 'left',
			playlistList: [],
			tags: []
		};
	}

	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			await this.getPlaylistList();
		}
		this.addTags();
		getSocket().on('playlistsUpdated', this.getPlaylistList);
		getSocket().on('playlistInfoUpdated', this.playlistInfoUpdated);
		getSocket().on('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().on('operatorNotificationError', this.operatorNotificationError);
		getSocket().on('operatorNotificationWarning', this.operatorNotificationWarning);
	}

	componentWillUnmount() {
		getSocket().off('playlistsUpdated', this.getPlaylistList);
		getSocket().off('playlistInfoUpdated', this.playlistInfoUpdated);
		getSocket().off('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().off('operatorNotificationError', this.operatorNotificationError);
		getSocket().off('operatorNotificationWarning', this.operatorNotificationWarning);
	}

	operatorNotificationInfo = (data: { code: string, data: string }) => displayMessage('info', i18next.t(data.code, { data: data }));
	operatorNotificationError = (data: { code: string, data: string }) => displayMessage('error', i18next.t(data.code, { data: data }));
	operatorNotificationWarning = (data: { code: string, data: string }) => displayMessage('warning', i18next.t(data.code, { data: data }));

	playlistInfoUpdated = async (plaid: string) => {
		await this.getPlaylistList();
		if (this.context.globalState.frontendContext.playlistInfoLeft.plaid === plaid) setPlaylistInfoLeft(this.context.globalDispatch, plaid);
		if (this.context.globalState.frontendContext.playlistInfoRight.plaid === plaid) setPlaylistInfoRight(this.context.globalDispatch, plaid);
	}

	toggleSearchMenu1 = () => {
		this.setState({ searchMenuOpen1: !this.state.searchMenuOpen1 });
	};

	toggleSearchMenu2 = () => {
		this.setState({ searchMenuOpen2: !this.state.searchMenuOpen2 });
	};

	adminMessage = () => {
		showModal(this.context.globalDispatch, <AdminMessageModal />);
	};

	putPlayerCommando(event: any) {
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
				options: 0
			};
		} else {
			data = {
				command: namecommand
			};
		}
		commandBackend('sendPlayerCommand', data).catch(() => { });
	}

	async parseTags() {
		try {
			const response = await commandBackend('getTags');
			return response.content.filter((val: Tag) => val.karacount !== null)
				.map((val: { i18n: { [key: string]: string }, tid: string, name: string, types: Array<number | string>, karacount: string }) => {
					const trad = val?.i18n && val.i18n[getNavigatorLanguageIn3B() as string];
					return { value: val.tid, label: trad ? trad : (val.i18n['eng'] ? val.i18n['eng'] : val.name), type: val.types, karacount: val.karacount };
				});
		} catch (e) {
			//already display
		}
	}

	async parseYears() {
		const response = await commandBackend('getYears');
		return response.content.map((val: DBYear) => {
			return { value: val.year, label: val.year, type: [0], karacount: [{ type: 0, count: val.karacount }] };
		});
	}


	addTags = async () => {
		try {
			const [tags, years] = await Promise.all([this.parseTags(), this.parseYears()]);
			this.setState({ tags: tags.concat(years) });
		} catch (e) {
			// already display
		}
	}

	getPlaylistList = async () => {
		const playlistList: PlaylistElem[] = await commandBackend('getPlaylists');
		let kmStats;
		try {
			kmStats = await commandBackend('getStats');
		} catch (e) {
			kmStats = {
				karas: 0
			};
		}
		playlistList.push({
			plaid: 'efe3687f-9e0b-49fc-a5cc-89df25a17e94',
			name: i18next.t('PLAYLISTS.FAVORITES')
		});
		playlistList.push({
			plaid: '524de79d-10b2-49dc-90b1-597626d0cee8',
			name: i18next.t('PLAYLISTS.LIBRARY'),
			karacount: kmStats.karas
		});
		this.setState({ playlistList: playlistList });
	};

	toggleKaraDetail = async (kara: KaraElement, idPlaylist: string) => {
		const reason = [];
		if (kara.criterias) {
			kara.criterias.map(async criteria => reason.push(await decodeCriteriaReason(this.context.globalState.settings.data, criteria)));
		}
		showModal(this.context.globalDispatch, <KaraDetail kid={kara.kid} playlistcontentId={kara.plcid} scope='admin'
			plaid={idPlaylist} criteriaLabel={reason.join(', ')} />);
	};

	render() {
		return (
			<>
				<KmAppWrapperDecorator>
					<AdminHeader
						powerOff={this.props.powerOff}
						adminMessage={this.adminMessage}
						putPlayerCommando={this.putPlayerCommando}
						currentSide={this.state.currentSide}
						currentPlaylist={this.state.playlistList.filter(playlistElem => playlistElem.flag_current)[0]}
					/>
					<ProgressBar />
					<KmAppBodyDecorator mode="admin" extraClass="fillSpace">
						{this.state.playlistList.length > 0 ?
							<Switch>
								<Route path="/admin/options" component={Options} />
								<Route path="/admin" render={() =>
									<PlaylistMainDecorator>
										<Playlist
											scope='admin'
											side={'left'}
											tags={this.state.tags}
											toggleSearchMenu={this.toggleSearchMenu1}
											searchMenuOpen={this.state.searchMenuOpen1}
											playlistList={this.state.playlistList}
											toggleKaraDetail={this.toggleKaraDetail}
										/>
										<Playlist
											scope='admin'
											side={'right'}
											tags={this.state.tags}
											toggleSearchMenu={this.toggleSearchMenu2}
											searchMenuOpen={this.state.searchMenuOpen2}
											playlistList={this.state.playlistList}
											toggleKaraDetail={this.toggleKaraDetail}
										/>
									</PlaylistMainDecorator>
								} />
							</Switch> : null
						}
					</KmAppBodyDecorator>

				</KmAppWrapperDecorator>
			</>
		);
	}
}

export default AdminPage;

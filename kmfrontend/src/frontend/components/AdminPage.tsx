import i18next from 'i18next';
import React, { Component } from 'react';

import { DBYear } from '../../../../src/lib/types/database/kara';
import { PublicPlayerState } from '../../../../src/types/state';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { getNavigatorLanguageIn3B } from '../../utils/isoLanguages';
import { commandBackend, getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';
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
	options: boolean;
	idsPlaylist: { left: number, right: number };
	searchMenuOpen1: boolean;
	searchMenuOpen2: boolean;
	statusPlayer?: PublicPlayerState;
	currentSide: number;
	playlistList: Array<PlaylistElem>;
	// Workaround for Safari (forcedHeight on <Playlist> and onResize on <PlaylistMainDecorator>)
	// See PublicPage.tsx
	plHeight?: number;
	tags?: Array<Tag>;
}

class AdminPage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			options: window.location.search.indexOf('config') !== -1,
			idsPlaylist: { left: 0, right: 0 },
			searchMenuOpen1: false,
			searchMenuOpen2: false,
			currentSide: 1,
			playlistList: []
		};
	}

	async componentDidMount() {
		this.addTags();
		if (this.context.globalState.auth.isAuthenticated) {
			await this.getPlaylistList();
		}
		getSocket().on('publicPlaylistUpdated', this.getPlaylistList);
		getSocket().on('playlistsUpdated', this.getPlaylistList);
		getSocket().on('playlistInfoUpdated', this.getPlaylistList);
		getSocket().on('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().on('operatorNotificationError', this.operatorNotificationError);
		getSocket().on('notificationEndOfSessionNear', this.notificationEndOfSessionNear);
	}

	componentWillUnmount() {
		getSocket().off('publicPlaylistUpdated', this.getPlaylistList);
		getSocket().off('playlistsUpdated', this.getPlaylistList);
		getSocket().off('playlistInfoUpdated', this.getPlaylistList);
		getSocket().off('operatorNotificationInfo', this.operatorNotificationInfo);
		getSocket().off('operatorNotificationError', this.operatorNotificationError);
		getSocket().off('notificationEndOfSessionNear', this.notificationEndOfSessionNear);
	}

	operatorNotificationInfo = (data:{code: string, data: string}) => displayMessage('info', i18next.t(data.code));
	operatorNotificationError = (data:{code: string, data: string}) => displayMessage('error', i18next.t(data.code));
	notificationEndOfSessionNear = (data:string) => displayMessage('warning', i18next.t('NOTIFICATION.OPERATOR.INFO.END_OF_SESSION_NEAR', {data: data}));

	majIdsPlaylist = (side: number, value: number) => {
		const idsPlaylist = this.state.idsPlaylist;
		if (side === 1) {
			idsPlaylist.left = Number(value);
		} else {
			idsPlaylist.right = Number(value);
		}
		this.setState({ idsPlaylist: idsPlaylist });
	};

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
		commandBackend('sendPlayerCommand', data).catch(() => {});
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
		const [tags, years] = await Promise.all([this.parseTags(), this.parseYears()]);
		this.setState({ tags: tags.concat(years) });
	}

	getPlaylistList = async () => {
		const playlistList = await commandBackend('getPlaylists');
		const kmStats = await commandBackend('getStats');
		playlistList.push({
			playlist_id: -2,
			name: i18next.t('PLAYLIST_BLACKLIST')
		});

		playlistList.push({
			playlist_id: -4,
			name: i18next.t('PLAYLIST_BLACKLIST_CRITERIAS')
		});

		playlistList.push({
			playlist_id: -3,
			name: i18next.t('PLAYLIST_WHITELIST')
		});
		playlistList.push({
			playlist_id: -5,
			name: i18next.t('PLAYLIST_FAVORITES')
		});
		playlistList.push({
			playlist_id: -1,
			name: i18next.t('PLAYLIST_KARAS'),
			karacount: kmStats.karas
		});
		this.setState({ playlistList: playlistList });
	};

	toggleKaraDetail = (kara:KaraElement, idPlaylist: number) => {
		showModal(this.context.globalDispatch, <KaraDetail kid={kara.kid} playlistcontentId={kara.playlistcontent_id} scope='admin'
			idPlaylist={idPlaylist} />);
	};

	render() {
		return (
			<>
				<KmAppWrapperDecorator>
					<AdminHeader
						setOptionMode={() => {
							this.setState({options: !this.state.options});
						}}
						powerOff={this.props.powerOff}
						options={this.state.options}
						adminMessage={this.adminMessage}
						putPlayerCommando={this.putPlayerCommando}
						currentSide={this.state.currentSide}
						idsPlaylist={this.state.idsPlaylist}
						currentPlaylist={this.state.playlistList.filter(playlistElem => playlistElem.flag_current)[0]}
					/>

					<ProgressBar/>
					<KmAppBodyDecorator mode="admin" extraClass="fillSpace">
						{this.state.playlistList.length > 0 ?
							<React.Fragment>
								{
									this.state.options ?
										<Options close={() => this.setState({ options: false })} />
										: <PlaylistMainDecorator currentSide={this.state.currentSide}>
											<Playlist
												scope='admin'
												side={1}
												idPlaylistTo={this.state.idsPlaylist.right}
												majIdsPlaylist={this.majIdsPlaylist}
												tags={this.state.tags}
												toggleSearchMenu={this.toggleSearchMenu1}
												searchMenuOpen={this.state.searchMenuOpen1}
												playlistList={this.state.playlistList}
												toggleKaraDetail={this.toggleKaraDetail}
											/>
											<Playlist
												scope='admin'
												side={2}
												idPlaylistTo={this.state.idsPlaylist.left}
												majIdsPlaylist={this.majIdsPlaylist}
												tags={this.state.tags}
												toggleSearchMenu={this.toggleSearchMenu2}
												searchMenuOpen={this.state.searchMenuOpen2}
												playlistList={this.state.playlistList}
												toggleKaraDetail={this.toggleKaraDetail}
											/>
										</PlaylistMainDecorator>
								}
							</React.Fragment> : null
						}
					</KmAppBodyDecorator>

				</KmAppWrapperDecorator>
			</>
		);
	}
}

export default AdminPage;

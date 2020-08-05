import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { Token } from '../../../src/lib/types/user';
import { Config } from '../../../src/types/config';
import { PublicPlayerState } from '../../../src/types/state';
import store from '../store';
import { Tag } from '../types/tag';
import AdminHeader from './AdminHeader';
import KmAppBodyDecorator from './decorators/KmAppBodyDecorator';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import PlaylistMainDecorator from './decorators/PlaylistMainDecorator';
import Playlist from './karas/Playlist';
import ProgressBar from './karas/ProgressBar';
import AdminMessageModal from './modals/AdminMessageModal';
import LoginModal from './modals/LoginModal';
import ProfilModal from './modals/ProfilModal';
import Options from './options/Options';
import { displayMessage, getSocket, is_touch_device } from './tools';

interface IProps {
	config: Config;
	powerOff: (() => void) | undefined;
	tags?: Array<Tag>;
	showVideo: (file: string) => void;
	getSettings: () => void;
}

interface IState {
	options: boolean;
	idsPlaylist: { left: number, right: number };
	searchMenuOpen1: boolean;
	searchMenuOpen2: boolean;
	mobileMenu: boolean;
	statusPlayer?: PublicPlayerState;
	currentSide: number;
	playlistList: Array<PlaylistElem>;
}

class AdminPage extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			options: window.location.search.indexOf('config') !== -1,
			idsPlaylist: { left: 0, right: 0 },
			searchMenuOpen1: false,
			searchMenuOpen2: false,
			mobileMenu: false,
			currentSide: 1,
			playlistList: []
		};
		if (!store.getLogInfos() || !(store.getLogInfos() as Token).token || (store.getLogInfos() as Token).role !== 'admin') {
			if (store.getLogInfos() && (store.getLogInfos() as Token).token && (store.getLogInfos() as Token).role !== 'admin') {
				displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
			}
			store.logOut();
			this.openLoginOrProfileModal();
		}
	}

	async componentDidMount() {
		if (is_touch_device()) {
			getSocket().on('playerStatus', (data: PublicPlayerState) => {
				let val = data.volume;
				const base = 100;
				const pow = 0.76;
				val = val / base;
				data.volume = base * Math.pow(val, 1 / pow);
				this.setState({ statusPlayer: data });
			});
		}
		if (axios.defaults.headers.common['authorization']) {
			await this.getPlaylistList();
		}
		getSocket().on('publicPlaylistUpdated', this.getPlaylistList);
		getSocket().on('playlistsUpdated', this.getPlaylistList);
		getSocket().on('playlistInfoUpdated', this.getPlaylistList);
		store.addChangeListener('loginOut', this.openLoginOrProfileModal);
		store.addChangeListener('loginUpdated', this.getPlaylistList);
		getSocket().on('operatorNotificationInfo ', (data:{code: string, data: string}) => displayMessage('info', i18next.t(data.code)));
		getSocket().on('operatorNotificationError', (data:{code: string, data: string}) => displayMessage('error', i18next.t(data.code)));
		getSocket().on('notificationEndOfSessionNear', (data:string) => displayMessage('warning', i18next.t('NOTIFICATION.OPERATOR.INFO.END_OF_SESSION_NEAR', {data: data})));
	}

	componentWillUnmount() {
		store.removeChangeListener('loginOut', this.openLoginOrProfileModal);
		store.removeChangeListener('loginUpdated', this.getPlaylistList);
	}

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

	openLoginOrProfileModal = () => {
		if (store.getLogInfos() && (store.getLogInfos() as Token).token) {
			ReactDOM.render(<ProfilModal
				config={this.props.config}
			/>, document.getElementById('modal'));
		} else {
			ReactDOM.render(<LoginModal
				scope='admin'
			/>, document.getElementById('modal'));
		}
	};

	adminMessage = () => {
		ReactDOM.render(<AdminMessageModal />, document.getElementById('modal'));
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
		axios.put('/player', data);
	}

	changeCurrentSide = () => {
		if (this.state.currentSide == 1) {
			this.setState({ currentSide: 2 });
		} else if (this.state.currentSide == 2) {
			this.setState({ currentSide: 1 });
		}
	};

	getPlaylistList = async () => {
		const response = await axios.get('/playlists/');
		const kmStats = await axios.get('/stats');
		const playlistList = response.data;
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
			karacount: kmStats.data.karas
		});
		this.setState({ playlistList: playlistList });
	};

	render() {
		return (
			<div id="adminPage">
				<KmAppWrapperDecorator>

					<AdminHeader
						config={this.props.config}
						toggleProfileModal={this.openLoginOrProfileModal}
						setOptionMode={() => {
							if (!this.state.options) this.props.getSettings();
							this.setState({ options: !this.state.options });
							store.getTuto() && store.getTuto().move(1);
						}}
						powerOff={this.props.powerOff}
						options={this.state.options}
						adminMessage={this.adminMessage}
						putPlayerCommando={this.putPlayerCommando}
						changeCurrentSide={this.changeCurrentSide}
						currentSide={this.state.currentSide}
						idsPlaylist={this.state.idsPlaylist}
						currentPlaylist={this.state.playlistList.filter(playlistElem => playlistElem.flag_current)[0]}
					></AdminHeader>

					<ProgressBar scope='admin' webappMode={this.props.config.Frontend.Mode}></ProgressBar>
					<KmAppBodyDecorator mode="admin" extraClass="">
						{this.state.playlistList.length > 0 ?
							<React.Fragment>
								{
									this.state.options ?
										<div className="row " id="manage">
											<Options
												config={this.props.config}
												close={() => this.setState({ options: false })}
											/>
										</div>
										: null
								}
								<PlaylistMainDecorator currentSide={this.state.currentSide}>
									<Playlist
										scope='admin'
										side={1}
										config={this.props.config}
										idPlaylistTo={this.state.idsPlaylist.right}
										majIdsPlaylist={this.majIdsPlaylist}
										tags={this.props.tags}
										toggleSearchMenu={this.toggleSearchMenu1}
										searchMenuOpen={this.state.searchMenuOpen1}
										showVideo={this.props.showVideo}
										playlistList={this.state.playlistList}
									/>
									<Playlist
										scope='admin'
										side={2}
										config={this.props.config}
										idPlaylistTo={this.state.idsPlaylist.left}
										majIdsPlaylist={this.majIdsPlaylist}
										tags={this.props.tags}
										toggleSearchMenu={this.toggleSearchMenu2}
										searchMenuOpen={this.state.searchMenuOpen2}
										showVideo={this.props.showVideo}
										playlistList={this.state.playlistList}
									/>
								</PlaylistMainDecorator>
							</React.Fragment> : null
						}
					</KmAppBodyDecorator>

				</KmAppWrapperDecorator>
				<div className="fixed-action-btn right mobileActions">
					<a
						className="btn-floating btn-large waves-effect z-depth-3 klogo"
						onClick={() =>
							this.setState({ mobileMenu: !this.state.mobileMenu })
						}
						style={{
							backgroundColor: '#1b4875',
							border: '.5px solid #FFFFFF12'
						}}
					/>
					{this.state.mobileMenu ? (
						<ul>
							<li>
								<a
									className="z-depth-3 btn-floating btn-large"
									style={{ backgroundColor: '#111' }}
									data-namecommand={this.state.statusPlayer && this.state.statusPlayer.showSubs ? 'hideSubs' : 'showSubs'}
									onClick={this.putPlayerCommando}
								>
									{this.state.statusPlayer && this.state.statusPlayer.showSubs ? (
										<i className="fas fa-closed-captioning"></i>
									) :
										(
											<span className="fa-stack">
												<i className="fas fa-closed-captioning fa-stack-1x"></i>
												<i className="fas fa-ban fa-stack-2x" style={{ color: '#943d42', opacity: 0.7 }}></i>
											</span>
										)}
								</a>
							</li>
							<li>
								<a
									className="z-depth-3 btn-floating btn-large"
									style={{ backgroundColor: '#111' }}
									onClick={this.adminMessage}
								>
									<i className="fas fa-comment" />
								</a>
							</li>
							{this.props.powerOff ?
								<li>
									<a
										className="z-depth-3 btn-floating btn-large"
										style={{ backgroundColor: '#111' }}
										onClick={this.props.powerOff}
									>
										<i className="fas fa-power-off" />
									</a>
								</li> : null
							}
							<li>
								<a
									className="z-depth-3 btn-floating btn-large logout"
									style={{ backgroundColor: '#111' }}
									onClick={() => {
										store.logOut();
										this.openLoginOrProfileModal();
									}}
								>
									<i className="fas fa-sign-out-alt" />
								</a>
							</li>
							<li>
								<a
									className="z-depth-3 btn-floating btn-large"
									style={{ backgroundColor: '#431b50' }}
									onClick={this.openLoginOrProfileModal}
								>
									<i className="fas fa-user" />
								</a>
							</li>
							<li id="optionsButton">
								<a
									className="z-depth-3 btn-floating btn-large"
									style={{ backgroundColor: '#111' }}
									onClick={() => {
										if (!this.state.options) this.props.getSettings();
										this.setState({ options: !this.state.options, mobileMenu: !this.state.mobileMenu });
										store.getTuto() && store.getTuto().move(1);
									}}
								>
									{this.state.options ?
										<React.Fragment>
											<i className="fas fa-list-ul" />&nbsp;{i18next.t('CL_PLAYLISTS')}
										</React.Fragment> :
										<React.Fragment>
											<i className="fas fa-cog" />&nbsp;{i18next.t('OPTIONS')}
										</React.Fragment>
									}
								</a>
							</li>
						</ul>
					) : null}
				</div>
			</div>
		);
	}
}

export default AdminPage;

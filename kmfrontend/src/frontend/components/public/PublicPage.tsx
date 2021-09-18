import i18next from 'i18next';
import React, { Component } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { DBPLC, DBPLCInfo } from '../../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';
import nanamiSingingPng from '../../../assets/nanami-sing.png';
import nanamiSingingWebP from '../../../assets/nanami-sing.webp';
import { setFilterValue } from '../../../store/actions/frontendContext';
import { closeModal, showModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import {displayMessage, isNonStandardPlaylist, nonStandardPlaylists, secondsTimeSpanToHMS} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { View } from '../../types/view';
import KmAppBodyDecorator from '../decorators/KmAppBodyDecorator';
import KmAppHeaderDecorator from '../decorators/KmAppHeaderDecorator';
import KmAppWrapperDecorator from '../decorators/KmAppWrapperDecorator';
import KaraDetail from '../karas/KaraDetail';
import Playlist from '../karas/Playlist';
import ClassicModeModal from '../modals/ClassicModeModal';
import PollModal from '../modals/PollModal';
import ProfilModal from '../modals/ProfilModal';
import UsersModal from '../modals/UsersModal';
import PlayerBox from './PlayerBox';
import PublicHeader from './PublicHeader';
import PublicHomepage from './PublicHomepage';
import TagsList from './TagsList';

interface IProps {
	route: RouteComponentProps;
}

interface IState {
	idsPlaylist: { left: DBPL, right: DBPL };
	isPollActive: boolean;
	classicModeModal: boolean;
	view: View;
	tagType: number;
	kara: KaraElement;
	playerStopping: boolean;
	playerStopped: boolean;
	top: string;
	bottom: string;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	publicVisible: boolean;
	currentVisible: boolean;
	indexKaraDetail?: number;
	searchType: 'search' | 'recent' | 'requested';
}

let timer: any;

class PublicPage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			isPollActive: false,
			idsPlaylist: {
				left: { plaid: nonStandardPlaylists.library, name: '', flag_visible: true },
				right: { plaid: nonStandardPlaylists.library, name: '', flag_visible: true },
			},
			classicModeModal: false,
			view: 'home',
			tagType: undefined,
			kara: undefined,
			playerStopping: false,
			playerStopped: false,
			top: '0',
			bottom: '0',
			publicVisible: false,
			currentVisible: false,
			searchType: 'search'
		};
	}

	changeView = async (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => {
		let route;
		let searchType: 'search' | 'recent' | 'requested' = 'search';
		if (view === 'home') {
			route = '/public';
		} else if (view === 'tag') {
			tagType = tagType !== undefined ? tagType : this.state.tagType;
			route = `/public/tags/${tagType}`;
		}
		const idsPlaylist = this.state.idsPlaylist;
		if (view === 'favorites') {
			idsPlaylist.left = { plaid: nonStandardPlaylists.favorites, name: '', flag_visible: true };
			route = '/public/favorites';
		} else if (view === 'requested') {
			idsPlaylist.left = { plaid: nonStandardPlaylists.library, name: '', flag_visible: true };
			searchType = 'requested';
			route = '/public/search/requested';
		} else if (view === 'history') {
			idsPlaylist.left = { plaid: nonStandardPlaylists.library, name: '', flag_visible: true };
			searchType = 'recent';
			route = '/public/search/history';
		} else if (view === 'search') {
			idsPlaylist.left = { plaid: nonStandardPlaylists.library, name: '', flag_visible: true };
			searchType = 'search';
			route = '/public/search';
		} else if (view === 'publicPlaylist') {
			idsPlaylist.left = await this.getPlaylistInfo(this.context.globalState.settings.data.state.publicPlaid);
			this.context.globalState.settings.data.state.publicPlaid;
			route = `/public/playlist/${idsPlaylist.left}`;
		} else if (view === 'currentPlaylist') {
			idsPlaylist.left = await this.getPlaylistInfo(this.context.globalState.settings.data.state.currentPlaid);
			route = `/public/playlist/${idsPlaylist.left}`;
		}
		if (this.state.indexKaraDetail === undefined) {
			setFilterValue(
				this.context.globalDispatch,
				'',
				'left',
				this.state.idsPlaylist.left.plaid
			);
		}
		this.setState({ view, tagType, idsPlaylist, searchValue, searchCriteria, searchType, kara: undefined });
		this.props.route.history.push(route);
	};

	majIdsPlaylist = async (side: 'left' | 'right', plaid: string) => {
		const idsPlaylist = this.state.idsPlaylist;
		let playlistInfo;
		if (!isNonStandardPlaylist(plaid)) {
			playlistInfo = await this.getPlaylistInfo(plaid);
		} else {
			playlistInfo = { plaid, name: '', flag_visible: true };
		}
		if (side === 'left') {
			idsPlaylist.left = playlistInfo;
		}
		this.setState({ idsPlaylist: idsPlaylist });
	};

	getPlaylistInfo = async (plaid: string): Promise<DBPL> => {
		try {
			return await commandBackend('getPlaylist', { plaid });
		} catch (e) {
			// already display
		}
	};

	initView() {
		if (this.props.route.location.pathname.includes('/public/search/requested')) {
			this.changeView('requested');
		} if (this.props.route.location.pathname.includes('/public/search/history')) {
			this.changeView('history');
		} else if (this.props.route.location.pathname.includes('/public/search')) {
			this.changeView('search');
		} else if (this.props.route.location.pathname.includes('/public/favorites')) {
			this.changeView('favorites');
		} else if (this.props.route.location.pathname.includes('/public/tags')) {
			const tagType = Number(this.props.route.location.pathname.substring(this.props.route.location.pathname.lastIndexOf('/') + 1));
			this.changeView('tag', tagType);
		} else if (this.props.route.location.pathname.includes('/public/playlist')) {
			const idPlaylist = this.props.route.location.pathname.substring(this.props.route.location.pathname.lastIndexOf('/') + 1);
			if (idPlaylist === this.context.globalState.settings.data.state.publicPlaid) {
				this.changeView('publicPlaylist');
			} else if (idPlaylist === this.context.globalState.settings.data.state.currentPlaid) {
				this.changeView('currentPlaylist');
			}
		}
	}

	historyCallback: () => void

	async componentDidMount() {
		if (this.context?.globalState.settings.data.config?.Frontend?.Mode !== 0) await this.getPlaylistList();
		this.majIdsPlaylist('right', this.context.globalState.settings.data.state.publicPlaid);
		this.initView();
		getSocket().on('publicPlaylistUpdated', this.publicPlaylistUpdated);
		getSocket().on('playlistInfoUpdated', this.playlistInfoUpdated);
		getSocket().on('playerStatus', this.displayClassicModeModal);
		getSocket().on('songPollStarted', this.songPollStarted);
		getSocket().on('songPollEnded', this.songPollEnded);
		getSocket().on('songPollResult', this.songPollResult);
		getSocket().on('adminMessage', this.adminMessage);
		getSocket().on('userSongPlaysIn', this.userSongPlaysIn);
		getSocket().on('nextSong', this.nextSong);
		this.historyCallback = this.props.route.history.listen(() => {
			if (this.state.indexKaraDetail === undefined) {
				setFilterValue(this.context.globalDispatch, '', 'left', this.state.idsPlaylist.left.plaid);
			}
		});
	}

	componentWillUnmount() {
		getSocket().off('publicPlaylistUpdated', this.publicPlaylistUpdated);
		getSocket().off('playlistInfoUpdated', this.playlistInfoUpdated);
		getSocket().off('playerStatus', this.displayClassicModeModal);
		getSocket().off('songPollStarted', this.songPollStarted);
		getSocket().off('songPollEnded', this.songPollEnded);
		getSocket().off('songPollResult', this.songPollResult);
		getSocket().off('adminMessage', this.adminMessage);
		getSocket().off('userSongPlaysIn', this.userSongPlaysIn);
		getSocket().off('nextSong', this.nextSong);
		this.historyCallback();
	}

	publicPlaylistUpdated = async (idPlaylist: string) => {
		if (idPlaylist !== this.context.globalState.settings.data.state.publicPlaid) {
			await this.getPlaylistList();
			setSettings(this.context.globalDispatch);
			this.majIdsPlaylist('right', idPlaylist);
		}
	}

	playlistInfoUpdated = (plaid: string) => {
		this.getPlaylistList();
		if (this.state.idsPlaylist.left.plaid === plaid) this.majIdsPlaylist('left', plaid);
		if (this.state.idsPlaylist.right.plaid === plaid) this.majIdsPlaylist('right', plaid);
	}

	getPlaylistList = async () => {
		try {
			const playlistsList = await commandBackend('getPlaylists');
			playlistsList.forEach(playlist => {
				if (playlist.flag_public) {
					this.setState({ publicVisible: playlist.flag_visible });
				}
				if (playlist.flag_current) {
					this.setState({ currentVisible: playlist.flag_visible });
				}
			});
		} catch (e) {
			// already display
		}
	}

	songPollStarted = () => {
		if (this.context.globalState.auth.isAuthenticated) {
			this.setState({ isPollActive: true });
			showModal(this.context.globalDispatch,
				<PollModal hasVoted={() => this.setState({ isPollActive: false })} />);
		}
	}

	songPollEnded = () => {
		this.setState({ isPollActive: false });
		closeModal(this.context.globalDispatch);
	}

	songPollResult = (data: any) => {
		displayMessage('success', i18next.t('POLLENDED', { kara: data.kara.substring(0, 100), votes: data.votes }));
	}

	adminMessage = (data: any) => displayMessage('info', <div><label>{i18next.t('CL_INFORMATIVE_MESSAGE')}</label> <br />{data.message}</div>, data.duration)

	userSongPlaysIn = (data: DBPLCInfo) => {
		if (data && data.username === this.context.globalState.auth.data.username) {
			const playTime = new Date(Date.now() + data.time_before_play * 1000);
			const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			const beforePlayTime = secondsTimeSpanToHMS(data.time_before_play, 'hm');
			displayMessage('info', i18next.t('USER_SONG_PLAYS_IN', {
				kara: buildKaraTitle(this.context.globalState.settings.data, data, true),
				time: beforePlayTime,
				date: playTimeDate
			}));
		}
	}

	nextSong = (data: DBPLC) => {
		if (data && data.flag_visible && !this.state.playerStopping) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				displayMessage('info',
					<div>
						<label>{i18next.t('NEXT_SONG_MESSAGE')}</label>
						<br />
						{buildKaraTitle(this.context.globalState.settings.data, data, true)}
					</div>);
			}, 500);
		}
	}

	displayClassicModeModal = (data: PublicPlayerState) => {
		if (data.stopping !== undefined) this.setState({ playerStopping: data.stopping });
		if (data.playerStatus === 'stop') this.setState({ playerStopped: true });
		else if (typeof data.playerStatus === 'string') this.setState({ playerStopped: false });
		if (this.state.playerStopped
			&& data.currentRequester === this.context.globalState.auth.data.username
			&& !this.state.classicModeModal) {
			showModal(this.context.globalDispatch, <ClassicModeModal />);
			this.setState({ classicModeModal: true });
		} else if (!this.state.playerStopped && this.state.classicModeModal) {
			closeModal(this.context.globalDispatch);
			this.setState({ classicModeModal: false });
		}
	};

	toggleKaraDetail = (kara: KaraElement, plaid: string, indexKaraDetail: number) => {
		this.setState({ kara, indexKaraDetail }, () => {
			this.majIdsPlaylist('left', plaid);
			this.props.route.history.push(`/public/karaoke/${kara.kid}`);
		});
	};

	render() {
		if (this.context?.globalState.settings.data.config?.Frontend?.Mode !== 2 && this.props.route.location.pathname.includes('/public/search')) {
			this.changeView('currentPlaylist');
		}
		return this.context?.globalState.settings.data.config.Frontend?.Mode === 0 ?
			(<div
				style={{
					top: '25%',
					position: 'relative',
					textAlign: 'center'
				}}
			>
				<picture>
					<source type="image/webp" srcSet={nanamiSingingWebP} />
					<source type="image/png" srcSet={nanamiSingingPng} />
					<img alt="Nanami is singing!" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)' }}
						src={nanamiSingingPng}
					/>
				</picture>
				<div style={{ fontSize: '30px', padding: '10px' }}>
					{i18next.t('WEBAPPMODE_CLOSED_MESSAGE')}
				</div>
			</div>):(
				<>
					<PublicHeader
						openModal={(type: string) => this.props.route.history.push(`/public/${type}`)}
						onResize={top => this.setState({ top })}
						changeView={this.changeView} currentView={this.state.view}
						currentVisible={this.state.currentVisible}
						publicVisible={this.state.publicVisible}
					/>
					<PlayerBox
						mode="fixed"
						show={this.state.view !== 'home'}
						currentVisible={this.state.currentVisible}
						goToCurrentPL={() => this.changeView('currentPlaylist')}
						onResize={bottom => this.setState({ bottom })}
					/>
					<KmAppWrapperDecorator single top={this.state.top} bottom={this.state.bottom} view={this.state.view}
						hmagrin={(!['favorites', 'publicPlaylist', 'currentPlaylist', 'tag', 'search']
							.includes(this.state.view)) && this.state.kara === undefined}>
						<Switch>
							<Route path="/public/user" render={() =>
								<ProfilModal
									scope='public'
									closeProfileModal={() => this.props.route.history.goBack()}
								/>
							} />
							<Route path="/public/users" render={() =>
								<UsersModal
									scope='public'
									closeModal={() => this.props.route.history.goBack()}
								/>
							} />
							<Route path="/public/karaoke/:kid" render={({ match }) =>
								<KaraDetail kid={this.state.kara?.kid || match.params.kid}
									playlistcontentId={this.state.kara?.plcid}
									scope='public'
									plaid={this.state.idsPlaylist.left.plaid}
									closeOnPublic={() => {
										this.props.route.history.goBack();
										this.setState({ kara: undefined });
									}}
									changeView={this.changeView} />
							} />
							<Route path={[
								'/public/search',
								'/public/playlist/:plaid',
								'/public/favorites',
								'/public/tags/:tagType'
							]} render={({ match }) =>
								<React.Fragment>
									<KmAppHeaderDecorator mode="public">
										<button
											className="btn"
											type="button"
											onClick={() => this.changeView((this.state.view === 'search' && this.state.searchCriteria ? 'tag' : 'home'))}>
											<i className="fas fa-arrow-left" />
										</button>
										<div
											className="plSearch"
										>
											<input
												placeholder={`\uF002 ${i18next.t('SEARCH')}`}
												type="text"
												value={this.context.globalState.frontendContext.filterValue1}
												onChange={e =>
													setFilterValue(
														this.context.globalDispatch,
														e.target.value,
														'left',
														this.state.idsPlaylist.left.plaid
													)
												}
											/>
										</div>
										{this.state.isPollActive ? (
											<button
												className="btn btn-default showPoll"
												onClick={() => showModal(this.context.globalDispatch,
													<PollModal hasVoted={() => this.setState({ isPollActive: false })} />)
												}
											>
												<i className="fas fa-chart-line" />
											</button>
										) : null}
									</KmAppHeaderDecorator>

									<KmAppBodyDecorator
										mode={this.context?.globalState.settings.data.config?.Frontend?.Mode}
										extraClass='JustPlaylist fillSpace'
									>
										{this.state.view === 'tag' ?
											<TagsList
												tagType={this.state.tagType}
												changeView={this.changeView}
											/> :
											<Playlist
												scope="public"
												side={'left'}
												playlist={this.state.idsPlaylist.left}
												oppositePlaylist={this.state.idsPlaylist.right}	
												majIdsPlaylist={this.majIdsPlaylist}
												toggleKaraDetail={this.toggleKaraDetail}
												searchValue={this.state.searchValue}
												searchCriteria={this.state.searchCriteria}
												indexKaraDetail={this.state.indexKaraDetail}
												clearIndexKaraDetail={() => this.setState({ indexKaraDetail: undefined })}
												searchType={
													this.props.route.location.pathname.includes('/public/search/requested') ?
														'requested' :
														(this.props.route.location.pathname.includes('/public/search/history') ?
															'recent' :
															this.state.searchType
														)
												}
											/>
										}
									</KmAppBodyDecorator>
								</React.Fragment>
							} />
							<Route path='/public' render={() =>
								<PublicHomepage
									changeView={this.changeView}
									toggleKaraDetail={this.toggleKaraDetail}
									activePoll={this.state.isPollActive}
									currentVisible={this.state.currentVisible}
									publicVisible={this.state.publicVisible}
									openPoll={() => showModal(this.context.globalDispatch,
										<PollModal hasVoted={() => this.setState({ isPollActive: false })} />)
									}
								/>
							} />
						</Switch>
					</KmAppWrapperDecorator>
				</>
			);
	}
}

export default PublicPage;

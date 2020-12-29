import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Route, RouteComponentProps, Switch } from 'react-router';

import { DBPLC, DBPLCInfo } from '../../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';
import { setFilterValue } from '../../../store/actions/frontendContext';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { displayMessage, secondsTimeSpanToHMS } from '../../../utils/tools';
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
import PlayerBox from './PlayerBox';
import PublicHeader from './PublicHeader';
import PublicHomepage from './PublicHomepage';
import TagsList from './TagsList';

interface IProps {
	showVideo: (file: string) => void;
	route: RouteComponentProps;
}

interface IState {
	idsPlaylist: { left: number, right: number };
	isPollActive: boolean;
	classicModeModal: boolean;
	kidPlaying?: string;
	view: View;
	tagType: number;
	kara: KaraElement;
	playerStopping: boolean;
	top: string;
	bottom: string;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	publicVisible: boolean;
	currentVisible: boolean;
	indexKaraDetail?: number;
}

let timer: any;

class PublicPage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			isPollActive: false,
			idsPlaylist: { left: -1, right: 0 },
			classicModeModal: false,
			view: 'home',
			tagType: undefined,
			kara: undefined,
			playerStopping: false,
			top: '0',
			bottom: '0',
			publicVisible: true,
			currentVisible: true
		};
	}

	changeView = (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => {
		if (view === 'home') {
			this.props.route.history.push('/public');
		} else if (view === 'tag') {
			this.props.route.history.push(`/public/tags/${tagType}`);
		}
		const idsPlaylist = this.state.idsPlaylist;
		if (view === 'favorites') {
			idsPlaylist.left = -5;
			this.props.route.history.push('/public/favorites');
		} else if (view === 'search') {
			idsPlaylist.left = -1;
			this.props.route.history.push('/public/search');
		} else if (view === 'publicPlaylist') {
			idsPlaylist.left = this.context.globalState.settings.data.state.publicPlaylistID;
			this.props.route.history.push(`/public/playlist/${idsPlaylist.left}`);
		} else if (view === 'currentPlaylist') {
			idsPlaylist.left = this.context.globalState.settings.data.state.currentPlaylistID;
			this.props.route.history.push(`/public/playlist/${idsPlaylist.left}`);
		}
		setFilterValue(
			this.context.globalDispatch,
			'',
			1,
			this.state.idsPlaylist.left
		);
		this.setState({ view, tagType, idsPlaylist, searchValue, searchCriteria, kara: undefined });
	};

	majIdsPlaylist = (side: number, value: number) => {
		const idsPlaylist = this.state.idsPlaylist;
		if (side === 1) {
			idsPlaylist.left = Number(value);
		}
		this.setState({ idsPlaylist: idsPlaylist });
	};

	initView() {
		if (this.props.route.location.pathname.includes('/public/search')) {
			this.changeView('search');
		} else if (this.props.route.location.pathname.includes('/public/favorites')) {
			this.changeView('favorites');
		} else if (this.props.route.location.pathname.includes('/public/tags')) {
			const tagType = Number(this.props.route.location.pathname.substring(this.props.route.location.pathname.lastIndexOf('/') + 1));
			this.changeView('tag', tagType);
		} else if (this.props.route.location.pathname.includes('/public/playlist')) {
			const idPlaylist = Number(this.props.route.location.pathname.substring(this.props.route.location.pathname.lastIndexOf('/') + 1));
			if (idPlaylist === this.context.globalState.settings.data.state.publicPlaylistID) {
				this.changeView('publicPlaylist');
			} else if (idPlaylist === this.context.globalState.settings.data.state.currentPlaylistID) {
				this.changeView('currentPlaylist');
			}
		}
	}

	async componentDidMount() {
		await this.getPlaylistList();
		await this.initView();
		getSocket().on('playlistInfoUpdated', this.getPlaylistList);
		getSocket().on('playerStatus', this.displayClassicModeModal);
		getSocket().on('newSongPoll', this.newSongPoll);
		getSocket().on('songPollEnded', this.songPollEnded);
		getSocket().on('songPollResult', this.songPollResult);
		getSocket().on('adminMessage', this.adminMessage);
		getSocket().on('userSongPlaysIn', this.userSongPlaysIn);
		getSocket().on('nextSong', this.nextSong);
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.displayClassicModeModal);
		getSocket().off('newSongPoll', this.newSongPoll);
		getSocket().off('songPollEnded', this.songPollEnded);
		getSocket().off('songPollResult', this.songPollResult);
		getSocket().off('adminMessage', this.adminMessage);
		getSocket().off('userSongPlaysIn', this.userSongPlaysIn);
		getSocket().off('nextSong', this.nextSong);
	}

	getPlaylistList = async () => {
		const playlistsList = await commandBackend('getPlaylists');
		playlistsList.forEach(playlist => {
			if (playlist.flag_public) {
				this.setState({ publicVisible: playlist.flag_visible });
			}
			if (playlist.flag_current) {
				this.setState({ currentVisible: playlist.flag_visible });
			}
		});
	}

	newSongPoll = () => {
		if (this.context.globalState.auth.isAuthenticated) {
			this.setState({ isPollActive: true });
			ReactDOM.render(<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
				document.getElementById('modal'));
		}
	}

	songPollEnded = () => {
		this.setState({ isPollActive: false });
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
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
		if (data.playerStatus === 'stop'
			&& data.currentRequester === this.context.globalState.auth.data.username
			&& !this.state.classicModeModal) {
			ReactDOM.render(<ClassicModeModal />, document.getElementById('modal'));
			this.setState({ classicModeModal: true });
		} else if (data.playerStatus === 'play' && this.state.classicModeModal) {
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
			this.setState({ classicModeModal: false });
		}
	};

	toggleKaraDetail = (kara: KaraElement, _idPlaylist: number, indexKaraDetail: number) => {
		this.setState({ kara, indexKaraDetail });
		this.props.route.history.push(`/public/karaoke/${kara.kid}`);
	};

	render() {
		return (
			<>
				<PublicHeader
					openProfileModal={() => this.props.route.history.push('/public/user')}
					onResize={top => this.setState({ top })}
					changeView={this.changeView} />
				<PlayerBox
					fixed={true}
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
								context={this.context}
								scope='public'
								closeProfileModal={() => this.props.route.history.goBack()}
							/>
						} />
						<Route path="/public/karaoke/:kid" render={({ match }) =>
							<KaraDetail kid={this.state.kara?.kid || match.params.kid}
								playlistcontentId={this.state.kara?.playlistcontent_id}
								scope='public'
								idPlaylist={this.state.idsPlaylist.left}
								showVideo={this.props.showVideo}
								context={this.context}
								closeOnPublic={() => {
									this.props.route.history.goBack();
									this.setState({ kara: undefined });
								}}>
							</KaraDetail>
						} />
						<Route path={[
							'/public/search',
							'/public/playlist/:pl_id',
							'/public/favorites',
							'/public/tags/:tagType'
						]} render={() =>
							<React.Fragment>
								<KmAppHeaderDecorator mode="public">
									<button
										className="btn side2Button"
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
											defaultValue={this.context.globalState.frontendContext.filterValue1}
											onChange={e =>
												setFilterValue(
													this.context.globalDispatch,
													e.target.value,
													1,
													this.state.idsPlaylist.left
												)
											}
										/>
									</div>
									{this.state.isPollActive ? (
										<button
											className="btn btn-default showPoll"
											onClick={() => ReactDOM.render(
												<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
												document.getElementById('modal'))
											}
										>
											<i className="fas fa-chart-line" />
										</button>
									) : null}
								</KmAppHeaderDecorator>

								<KmAppBodyDecorator
									mode={this.context?.globalState.settings.data.config?.Frontend.Mode}
									extraClass='JustPlaylist fillSpace'
								>
									{this.state.view === 'tag' ?
										<TagsList
											tagType={this.state.tagType}
											changeView={this.changeView}
										/> :
										<Playlist
											scope="public"
											side={1}
											idPlaylist={this.state.idsPlaylist.left}
											idPlaylistTo={this.context.globalState.settings.data.state.publicPlaylistID}
											majIdsPlaylist={this.majIdsPlaylist}
											toggleKaraDetail={this.toggleKaraDetail}
											searchValue={this.state.searchValue}
											searchCriteria={this.state.searchCriteria}
											indexKaraDetail={this.state.indexKaraDetail}
											clearIndexKaraDetail={() => this.setState({ indexKaraDetail: undefined })}
										/>
									}
								</KmAppBodyDecorator>
							</React.Fragment>
						} />
						<Route path='/public' render={() =>
							<PublicHomepage
								changeView={this.changeView}
								activePoll={this.state.isPollActive}
								currentVisible={this.state.currentVisible}
								publicVisible={this.state.publicVisible}
								openPoll={() => ReactDOM.render(
									<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
									document.getElementById('modal'))
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

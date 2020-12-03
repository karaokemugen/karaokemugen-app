import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { DBPLC, DBPLCInfo } from '../../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';
import { setFilterValue } from '../../../store/actions/frontendContext';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { getSocket } from '../../../utils/socket';
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
}

interface IState {
	idsPlaylist: { left: number, right: number };
	isPollActive: boolean;
	classicModeModal: boolean;
	kidPlaying?: string;
	view: View;
	profileModal: boolean;
	tagType: number;
	kara: KaraElement;
	playerStopping: boolean;
	top: string;
	bottom: string;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
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
			profileModal: false,
			view: 'home',
			tagType: undefined,
			kara: undefined,
			playerStopping: false,
			top: '0',
			bottom: '0'
		};
	}

	changeView = (
		view: View,
		tagType?: number,
		searchValue?:string,
		searchCriteria?: 'year' | 'tag'
	) => {
		const idsPlaylist = this.state.idsPlaylist;
		if (view === 'favorites') {
			idsPlaylist.left = -5;
		} else if (view === 'search') {
			idsPlaylist.left = -1;
		} else if (view === 'publicPlaylist') {
			idsPlaylist.left = this.context.globalState.settings.data.state.publicPlaylistID;
		} else if (view === 'currentPlaylist') {
			idsPlaylist.left = this.context.globalState.settings.data.state.currentPlaylistID;
		}
		setFilterValue(
			this.context.globalDispatch,
			'',
			1,
			this.state.idsPlaylist.left
		);
		this.setState({ view, tagType, idsPlaylist, searchValue, searchCriteria, kara: undefined, profileModal: false });
	};

	majIdsPlaylist = (side: number, value: number) => {
		const idsPlaylist = this.state.idsPlaylist;
		if (side === 1) {
			idsPlaylist.left = Number(value);
		}
		this.setState({ idsPlaylist: idsPlaylist });
	};

	componentDidMount() {
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
		this.setState({ playerStopping: data.stopping });
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

	toggleKaraDetail = (kara: KaraElement) => {
		this.setState({ kara });
	};

	render() {
		return (
			<>
				<PublicHeader
					openProfileModal={() => this.setState({ profileModal: true })}
					onResize={top => this.setState({ top })}
					changeView={this.changeView} />
				<PlayerBox
					fixed={true}
					show={this.state.view !== 'home'}
					goToCurrentPL={() => this.changeView('currentPlaylist')}
					onResize={bottom => this.setState({ bottom })}
				/>
				<KmAppWrapperDecorator single top={this.state.top} bottom={this.state.bottom} view={this.state.view} hmagrin={(!['favorites', 'publicPlaylist', 'currentPlaylist', 'tag', 'search'].includes(this.state.view)) && this.state.kara === undefined}>
					{this.state.profileModal ?
						<ProfilModal
							context={this.context}
							scope='public'
							closeProfileModal={() => this.setState({ profileModal: false })}
						/>
						: (this.state.kara ?
							<KaraDetail kid={this.state.kara.kid} playlistcontentId={this.state.kara.playlistcontent_id} scope='public'
								idPlaylist={this.state.idsPlaylist.left} showVideo={this.props.showVideo} context={this.context}
								closeOnPublic={() => this.setState({ kara: undefined })}>
							</KaraDetail>
							: (this.state.view === 'home' ?
								<PublicHomepage
									changeView={this.changeView}
									activePoll={this.state.isPollActive}
									openPoll={() => ReactDOM.render(
										<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
										document.getElementById('modal'))
									}
								/>
								: <React.Fragment>
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
											/>
										}
									</KmAppBodyDecorator>
								</React.Fragment>)
						)
					}
				</KmAppWrapperDecorator>
			</>
		);
	}
}

export default PublicPage;

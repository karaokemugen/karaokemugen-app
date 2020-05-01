import React, { Component } from 'react';
import i18next from 'i18next';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import KmAppBodyDecorator from './decorators/KmAppBodyDecorator';
import PlaylistMainDecorator from './decorators/PlaylistMainDecorator';
import Playlist from './karas/Playlist';
import PollModal from './modals/PollModal';
import getLuckyImage from '../assets/clover.png';
import webappClose from '../assets/dame.jpg';
import HelpModal from './modals/HelpModal';
import LoginModal from './modals/LoginModal';
import ProfilModal from './modals/ProfilModal';
import ClassicModeModal from './modals/ClassicModeModal';
import RadioButton from './generic/RadioButton';
import axios from 'axios';
import ProgressBar from './karas/ProgressBar';
import {buildKaraTitle, getSocket, is_touch_device,displayMessage,callModal, secondsTimeSpanToHMS} from './tools';
import store from '../store';
import ReactDOM from 'react-dom';
import { Config } from '../../../src/types/config';
import { Tag } from '../types/tag';
import { Token } from '../../../src/lib/types/user';
import { DBPLC, DBPLCInfo } from '../../../src/types/database/playlist';

interface IProps {
	config: Config;
	navigatorLanguage: string;
	tags: Array<Tag>;
	showVideo: (file:string) => void;
}

interface IState {
	idsPlaylist: {left: number, right: number};
	isPollActive: boolean;
	helpModal: boolean;
	lyrics: boolean;
	pseudoValue: string;
	mobileMenu: boolean;
	dropDownMenu: boolean;
	searchMenuOpen: boolean;
	classicModeModal: boolean;
	kidPlaying?: string;
	currentSide: number;
	playlistList: Array<PlaylistElem>;
}

let timer:any;

class PublicPage extends Component<IProps,IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			isPollActive: false,
			helpModal: false,
			lyrics: false,
			pseudoValue: '',
			mobileMenu: false,
			idsPlaylist: {left: 0, right: 0},
			dropDownMenu: false,
			searchMenuOpen: false,
			classicModeModal: false,
			currentSide: 1,
			playlistList: []
		};
		if (!store.getLogInfos() || !(store.getLogInfos() as Token).token) {
			this.openLoginOrProfileModal();
		} else if (this.props.config.Frontend.Mode === 1 && is_touch_device()) {
			callModal('confirm', i18next.t('WEBAPPMODE_LIMITED_NAME'),
				(<React.Fragment>
					<div className="text">
						{i18next.t('CL_HELP_PUBLIC_MOBILE_RESTRICTED')}
					</div>
					<div className="text">
						{i18next.t('CL_HELP_PUBLIC_MOBILE_RESTRICTED_DESCRIPTION')}
					</div>
				</React.Fragment>));
		}
	}

  majIdsPlaylist = (side:number, value:number) => {
  	var idsPlaylist = this.state.idsPlaylist;
  	if(side === 1) {
  		idsPlaylist.left = Number(value);
  	} else {
  		idsPlaylist.right = Number(value);
  	}
  	this.setState({idsPlaylist : idsPlaylist});
  };

  async componentDidMount() {
  	getSocket().on('playerStatus', this.displayClassicModeModal);
  	getSocket().on('newSongPoll', () => {
  		this.setState({ isPollActive: true});
  		ReactDOM.render(<PollModal />, document.getElementById('modal'));
  	});
  	getSocket().on('songPollEnded', () => {
		  this.setState({ isPollActive: false });
		  var element = document.getElementById('modal');
  		if(element) ReactDOM.unmountComponentAtNode(element);
  	});
  	getSocket().on('songPollResult', (data:any) => {
  		displayMessage('success',  i18next.t('POLLENDED', { kara: data.kara.substring(0, 100), votes: data.votes }));
  	});
  	getSocket().on('adminMessage', (data:any) => displayMessage('info', 
  		<div><label>{i18next.t('CL_INFORMATIVE_MESSAGE')}</label> <br/>{data.message}</div>, data.duration));
	getSocket().on('userSongPlaysIn', (data:DBPLCInfo) => {
		if (data && data.username === (store.getLogInfos() as Token).username) {
			let playTime = new Date(Date.now() + data.time_before_play * 1000);
			let playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			let beforePlayTime = secondsTimeSpanToHMS(data.time_before_play, 'hm');
			displayMessage('info', i18next.t('USER_SONG_PLAYS_IN', {
				kara: buildKaraTitle(data, true),
				time: beforePlayTime,
				date: playTimeDate
			}));
		}
	});
	getSocket().on('nextSong', (data:DBPLC) => {
		if (data && data.flag_visible) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				displayMessage('info', 
					<div>
						<label>{i18next.t('NEXT_SONG_MESSAGE')}</label>
						<br/>
						{buildKaraTitle(data, true)}
					</div>)}, 500);
		}
	});
	await this.getPlaylistList();
	getSocket().on('playlistsUpdated', this.getPlaylistList);
	store.addChangeListener('loginOut', this.openLoginOrProfileModal);
  }

	componentWillUnmount() {
		store.removeChangeListener('loginOut', this.openLoginOrProfileModal);
	}

  displayClassicModeModal = async (data:any) => {
  	if (data.status === 'stop' && data.playerStatus === 'pause' && data.currentRequester === (store.getLogInfos() as Token).username && !this.state.classicModeModal) {
  		ReactDOM.render(<ClassicModeModal />, document.getElementById('modal'));
  		this.setState({ classicModeModal: true });
  	} else if (data.playerStatus !== 'pause' && this.state.classicModeModal) {
		  var element = document.getElementById('modal');
  		if (element) ReactDOM.unmountComponentAtNode(element);
  		this.setState({ classicModeModal: false });
  	}
  };

  openLoginOrProfileModal = () => {
	this.closeMobileMenu();
  	if (store.getLogInfos() && (store.getLogInfos() as Token).token) {
  		ReactDOM.render(<ProfilModal
  			config={this.props.config}
  		/>, document.getElementById('modal'));
  	} else {
  		ReactDOM.render(<LoginModal
  			scope="public"
  		/>, document.getElementById('modal'));
  	}
  };

  setLyrics = () => {
	this.closeMobileMenu();
  	this.setState({ lyrics: !this.state.lyrics });
  };

  // pick a random kara & add it after (not) asking user's confirmation
  getLucky = async () => {
	this.closeMobileMenu();
  	var response = await axios.get('/api/karas?filter=' + store.getFilterValue(1)+'&random=1');
  	if (response.data && response.data.content && response.data.content[0]) {
  		var chosenOne = response.data.content[0].kid;
  		var response2 = await axios.get('/api/karas/' + chosenOne);
  		callModal('confirm', i18next.t('CL_CONGRATS'), i18next.t('CL_ABOUT_TO_ADD',{title: buildKaraTitle(response2.data, true)}), () => {
  			axios.post('/api/karas/' + chosenOne, { requestedby: (store.getLogInfos() as Token).username });
  		}, 'lucky');
  	}
  };

  changePseudo = async (e:any) => {
  	var response = await axios.put('/api/myaccount', { nickname : e.target.value });
  	this.setState({pseudoValue: response.data.nickname});
  };

  toggleSearchMenu = () => {
  	this.setState({searchMenuOpen: !this.state.searchMenuOpen});
  };

  updateKidPlaying = (kid:string) => {
  	this.setState({kidPlaying: kid});
  };

	changeCurrentSide = () => {
		if (this.state.currentSide==1) {
			this.setState({currentSide:2});
			if(store.getTuto() && store.getTuto().getStepLabel() === 'change_screen') {
				store.getTuto().move(1);
			}
		} else if (this.state.currentSide==2) {
			this.setState({currentSide:1});
			if(store.getTuto() && store.getTuto().getStepLabel() === 'change_screen2') {
				store.getTuto().move(1);
			}
		}
	};

	closeMobileMenu = () => {
		this.setState({ mobileMenu: false, dropDownMenu: false })
	}

	
	getPlaylistList = async () => {
		const response = await axios.get('/api/playlists/');
		var playlistList = response.data.filter((playlist: PlaylistElem) => playlist.flag_visible)
		if (this.props.config.Frontend.Permissions!.AllowViewBlacklist)
			playlistList.push({
				playlist_id: -2,
				name: i18next.t('PLAYLIST_BLACKLIST')
			});
		if (this.props.config.Frontend.Permissions!.AllowViewBlacklistCriterias)
			playlistList.push({
				playlist_id: -4,
				name: i18next.t('PLAYLIST_BLACKLIST_CRITERIAS')
			});
		if (this.props.config.Frontend.Permissions!.AllowViewWhitelist)
			playlistList.push({
				playlist_id: -3,
				name: i18next.t('PLAYLIST_WHITELIST')
			});
		this.setState({ playlistList: playlistList });
	};
  

  render() {
  	var logInfos = store.getLogInfos();
  	return (
  		<div id="publicPage">
  			{this.props.config.Frontend.Mode === 0 ? (
  				<div
  					style={{
  						top: '25%',
						  position: 'relative',
						  textAlign: 'center'
  					}}
  				>
  					<img
  						style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)' }}
  						src={webappClose}
  					/>
  					<div style={{ fontSize: '30px', padding: '10px' }}>
  						{i18next.t('WEBAPPMODE_CLOSED_MESSAGE')}
  					</div>
  				</div>
  			) : (
  				<React.Fragment>
  					<KmAppWrapperDecorator>
						<KmAppHeaderDecorator mode="public">
							{this.props.config.Frontend.Mode === 2 ? (
								<React.Fragment>
									<button
										type="button"
										className={
											'searchMenuButton btn btn-sm btn-default' +
											(this.state.searchMenuOpen
												? ' searchMenuButtonOpen'
												: '')
										}
										onClick={this.toggleSearchMenu}
									>
										<i className="fas fa-filter" />
									</button>

									<div
										className="plSearch"
										style={{
											width: logInfos && logInfos.role != 'guest' ? '' : '100%'
										}}
									>
										<i className="fas fa-search" />
										<input
											type="text"
											className="form-control"
											defaultValue={store.getFilterValue(1)}
											onChange={e =>
												store.setFilterValue(
													e.target.value,
													1,
													this.state.idsPlaylist.left
												)
											}
										/>
									</div>

									<button
										title={i18next.t('GET_LUCKY')}
										className="btn btn-lg btn-action btn-default getLucky"
										onClick={this.getLucky}
									>
										<img src={getLuckyImage} />
									</button>
								</React.Fragment>
							) : null}

							{logInfos && logInfos.role != 'guest' &&
								this.props.config.Frontend.Mode === 1 ? (
									<div className="pseudoChange">
										<input
											list="pseudo"
											type="text"
											id="choixPseudo"
											className="form-control"
											placeholder={i18next.t('NICKNAME')}
											onBlur={this.changePseudo}
											onKeyPress={e => {
												if (e.which == 13) this.changePseudo(e);
											}}
										/>
									</div>
								) : null}

							{this.props.config.Frontend.Mode === 2 ? (
								<React.Fragment>
									<button
										className={`btn btn-dark sideButton ${this.state.currentSide === 2 ? 'side2Button' : 'side1Button'}`}
										type="button" onClick={this.changeCurrentSide}>
											<i className="fas fa-tasks"></i>
									</button>
									<div className="dropdown buttonsNotMobile">
										<button
											className="btn btn-dark dropdown-toggle klogo"
											id="menuPC"
											type="button"
											onClick={() =>
												this.setState({
													dropDownMenu: !this.state.dropDownMenu
												})
											}
										/>
										{this.state.dropDownMenu ? (
											<ul className="dropdown-menu">
												<li>
													<a
														href="#"
														className="changePseudo"
														onClick={this.openLoginOrProfileModal}
													>
														<i className="fas fa-user" />&nbsp;
													{i18next.t('ACCOUNT')}
													</a>
												</li>
												<li>
													<a href="#" onClick={() => {
															this.closeMobileMenu();
															ReactDOM.render(<HelpModal />, document.getElementById('modal'))
														}}>
														<i className="fas fa-question-circle" />&nbsp;
													{i18next.t('HELP')}
													</a>
												</li>
												<li>
													<a
														href="#"
														className="logout"
														onClick={() => {
														store.logOut();
														this.openLoginOrProfileModal();
														}}
													>
														<i className="fas fa-sign-out-alt" />&nbsp;
													{i18next.t('LOGOUT')}
													</a>
												</li>
											</ul>
										) : null}
									</div>

									<div className="switchParent">
										{this.state.isPollActive ? (
											<button
												className="btn btn-default showPoll"
												onClick={() => ReactDOM.render(<PollModal />, document.getElementById('modal'))}
											>
												<i className="fas fa-chart-line" />
											</button>
										) : null}
										<RadioButton
											title={i18next.t('SWITCH_OPTIONS')}
											buttons={[
												{
													label: i18next.t('SWITCH_BAR_INFOS_TITLE'),
													active: !this.state.lyrics,
													onClick: this.setLyrics
												},
												{
													label: i18next.t('SWITCH_BAR_INFOS_LYRICS'),
													active: this.state.lyrics,
													onClick: this.setLyrics
												}
											]}
										/>
									</div>
								</React.Fragment>
							) : null}
						</KmAppHeaderDecorator>

  						<ProgressBar scope="public" lyrics={this.state.lyrics} />

  						<KmAppBodyDecorator
  							mode={this.props.config.Frontend.Mode}
  							extraClass={
  								this.props.config.Frontend.Mode === 1
  									? ' mode1'
  									: ''
  							}
  						>
							{this.state.playlistList.length > 0 ?
								<PlaylistMainDecorator currentSide={this.state.currentSide}>
									<Playlist
										scope="public"
										side={1}
										navigatorLanguage={this.props.navigatorLanguage}
										config={this.props.config}
										idPlaylistTo={this.state.idsPlaylist.right}
										majIdsPlaylist={this.majIdsPlaylist}
										tags={this.props.tags}
										toggleSearchMenu={this.toggleSearchMenu}
										searchMenuOpen={this.state.searchMenuOpen}
										showVideo={this.props.showVideo}
										kidPlaying={this.state.kidPlaying}
										updateKidPlaying={this.updateKidPlaying}
										playlistList={this.state.playlistList}
									/>
									<Playlist
										scope="public"
										side={2}
										navigatorLanguage={this.props.navigatorLanguage}
										config={this.props.config}
										idPlaylistTo={this.state.idsPlaylist.left}
										majIdsPlaylist={this.majIdsPlaylist}
										showVideo={this.props.showVideo}
										kidPlaying={this.state.kidPlaying}
										updateKidPlaying={this.updateKidPlaying}
										playlistList={this.state.playlistList}
									/>
								</PlaylistMainDecorator> : null
  							}
  						</KmAppBodyDecorator>
  					</KmAppWrapperDecorator>

					{this.props.config.Frontend.Mode === 2 &&
		this.state.isPollActive ? (
							<div
								className="fixed-action-btn right right2 mobileActions"
							>
								<a
									className="btn-floating btn-large waves-effect z-depth-3 showPoll"
									onClick={() => {
										this.closeMobileMenu();
										ReactDOM.render(<PollModal />, document.getElementById('modal'))
									}}
								>
									<i className="fas fa-bar-chart" />
								</a>
							</div>
						) : null}

					<div className="fixed-action-btn right mobileActions">
						<a
							className="btn-floating btn-large waves-effect z-depth-3 klogo"
							id="menuMobile"
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
								{this.props.config.Frontend.Mode === 2 ? (
									<React.Fragment>
										<li>
											<a
												className="z-depth-3 btn-floating btn-large logout"
												style={{ backgroundColor: '#111' }}
												onClick={() => {
													this.closeMobileMenu();
													store.logOut();
												}}
											>
												<i className="fas fa-sign-out-alt" />
											</a>
										</li>
										<li>
											<a
												className="z-depth-3 btn-floating btn-large getLucky"
												style={{ backgroundColor: '#111' }}
												onClick={this.getLucky}
											>
												<img
													style={{ height: '80%', marginTop: '10%' }}
													src={getLuckyImage}
												/>
											</a>
										</li>
									</React.Fragment>
								) : null}
								<li>
									<a
										className="z-depth-3 btn-floating btn-large"
										style={{ backgroundColor: '#613114' }}
										onClick={() => {
											this.closeMobileMenu();
											ReactDOM.render(<HelpModal/>, document.getElementById('modal'))
											}}
									>
										<i className="fas fa-question-circle" />
									</a>
								</li>
								<li>
									<a
										className="z-depth-3 btn-floating btn-large changePseudo"
										id="changePseudo"
										style={{ backgroundColor: '#431b50' }}
										onClick={this.openLoginOrProfileModal}
									>
										<i className="fas fa-user" />
									</a>
								</li>
								<li>
									<a
										className="z-depth-3 btn-floating btn-large"
										id="switchInfoBar"
										style={{ backgroundColor: '#125633' }}
										onClick={this.setLyrics}
									>
										{this.state.lyrics ? (
											<i className="fas fa-closed-captioning"/>
										) : (
											<i className="fas fa-info-circle" />
										)}
									</a>
								</li>
							</ul>
						) : null}
					</div>
  				</React.Fragment>
  			)}
  		</div>
  	);
  }
}

export default PublicPage;

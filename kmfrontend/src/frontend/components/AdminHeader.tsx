import i18next from 'i18next';
import merge from 'lodash.merge';
import React, { Component } from 'react';

import { CurrentSong } from '../../../../src/types/playlist';
import { PublicPlayerState } from '../../../../src/types/state';
import { logout } from '../../store/actions/auth';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { commandBackend, getSocket } from '../../utils/socket';
import { callModal, expand } from '../../utils/tools';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import RadioButton from './generic/RadioButton';
import ProfilModal from './modals/ProfilModal';
import UsersModal from './modals/UsersModal';

interface IProps {
	options: boolean;
	currentSide: number;
	idsPlaylist: { left: number, right: number };
	currentPlaylist: PlaylistElem;
	powerOff: (() => void) | undefined;
	adminMessage: () => void;
	putPlayerCommando: (event: any) => void;
	setOptionMode: () => void;
}

interface IState {
	dropDownMenu: boolean;
	songVisibilityOperator: boolean;
	statusPlayer?: PublicPlayerState;
	frontendMode?: number;
}

class AdminHeader extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			dropDownMenu: false,
			songVisibilityOperator: false,
			frontendMode: -1
		};
	}

	async componentDidMount() {
		this.setState({
			songVisibilityOperator: Boolean(this.context?.globalState.settings.data.config?.Playlist.MysterySongs.AddedSongVisibilityAdmin),
			frontendMode: this.context?.globalState.settings.data.config?.Frontend.Mode
		});
		if (this.context.globalState.auth.isAuthenticated) {
			const result = await commandBackend('getPlayerStatus');
			await this.setState({ statusPlayer: result });
		}
		getSocket().on('playerStatus', this.playerUpdate);
		document.getElementById('root').addEventListener('click', this.closeDropdownMenu);
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.playerUpdate);
		document.getElementById('root').removeEventListener('click', this.closeDropdownMenu);
	}

	closeDropdownMenu = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#menuPC')) {
			this.setState({ dropDownMenu: false });
		}
	}

	playerUpdate = (data: PublicPlayerState) => {
		let val = data.volume;
		const base = 100;
		const pow = 0.76;
		val = val / base;
		data.volume = base * Math.pow(val, 1 / pow);
		this.setState({ statusPlayer: merge(this.state.statusPlayer, data) });
	}

	toggleProfileModal = () => {
		this.setState({ dropDownMenu: !this.state.dropDownMenu });
		showModal(this.context.globalDispatch, <ProfilModal scope="admin" />);
	};

	toggleUsersModal = () => {
		this.setState({ dropDownMenu: !this.state.dropDownMenu });
		showModal(this.context.globalDispatch, <UsersModal scope="admin" />);
	};

	saveOperatorAdd = (songVisibility: boolean) => {
		const data = expand('Playlist.MysterySongs.AddedSongVisibilityAdmin', songVisibility);
		this.setState({ songVisibilityOperator: songVisibility });
		commandBackend('updateSettings', { setting: data });
	};

	changePublicInterfaceMode = (value: number) => {
		const data = expand('Frontend.Mode', value);
		this.setState({ frontendMode: value });
		commandBackend('updateSettings', { setting: data });
	};

	play = (event: any) => {
		if ((!this.state.statusPlayer || this.state.statusPlayer?.playerStatus === 'stop')
			&& this.props.idsPlaylist.left !== this.props.currentPlaylist?.playlist_id
			&& this.props.idsPlaylist.right !== this.props.currentPlaylist?.playlist_id
			&& (this.props.idsPlaylist.left > 0 || this.props.idsPlaylist.right > 0)) {
			callModal(this.context.globalDispatch, 'confirm', i18next.t('MODAL.PLAY_CURRENT_MODAL', { playlist: this.props.currentPlaylist.name }), '',
				() => commandBackend('sendPlayerCommand', { command: 'play' }));
		} else {
			this.props.putPlayerCommando(event);
		}
	}

	render() {
		const volume: number = (this.state.statusPlayer && !isNaN(this.state.statusPlayer.volume)) ? this.state.statusPlayer.volume : 100;

		return (
			<KmAppHeaderDecorator mode="admin">
				{this.props.options ?
					<button
						title={i18next.t('BACK_PLAYLISTS')}
						className="btn btn-default"
						onClick={this.props.setOptionMode}
					>
						<i className="fas fa-fw fa-long-arrow-alt-left "/>
					</button> : null
				}
				<div className="header-group switchs">
					<label className="control-label" title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}>
						{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_SHORT')}
              &nbsp;
  						<i className="far fa-question-circle"/>
					</label>
					<label className="control-label" title={i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}>
						{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_SHORT')}
            &nbsp;
  					<i className="far fa-question-circle"/>
					</label>
				</div>
				<div id="switchValue" className="header-group switchs">
					<RadioButton
						title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}
						buttons={[
							{
								label: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION'),
								active: this.state.songVisibilityOperator,
								activeColor: '#3c5c00',
								onClick: () => this.saveOperatorAdd(true),
								description: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_OFF')
							},
							{
								label: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION'),
								active: !this.state.songVisibilityOperator,
								activeColor: '#880500',
								onClick: () => this.saveOperatorAdd(false),
								description: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_ON')
							}
						]}
					/>
					<RadioButton
						title={i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}
						buttons={[
							{
								label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED_SHORT'),
								active: this.state.frontendMode === 0,
								activeColor: '#880500',
								onClick: () => this.changePublicInterfaceMode(0),
								description: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED')
							},
							{
								label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED_SHORT'),
								active: this.state.frontendMode === 1,
								activeColor: '#a36700',
								onClick: () => this.changePublicInterfaceMode(1),
								description: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED')
							},
							{
								label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN_SHORT'),
								active: this.state.frontendMode === 2,
								activeColor: '#3c5c00',
								onClick: () => this.changePublicInterfaceMode(2),
								description: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN')
							}
						]}
					/>
				</div>
				<div className="header-group controls">
					{
						this.state.statusPlayer?.stopping ?
							<button
								title={i18next.t('STOP_NOW')}
								id="stopNow"
								data-namecommand="stopNow"
								className="btn btn-danger stopButton"
								onClick={this.props.putPlayerCommando}
							>
								<i className="fas fa-fw fa-stop"/>
							</button> :
							<button
								title={i18next.t('STOP_AFTER')}
								id="stopAfter"
								data-namecommand="stopAfter"
								className="btn btn-danger-low stopButton"
								onClick={this.props.putPlayerCommando}
							>
								<i className="fas fa-fw fa-stop"/>
							</button>
					}
					<button
						title={i18next.t('PREVIOUS_SONG')}
						id="prev"
						data-namecommand="prev"
						className="btn btn-default"
						onClick={this.props.putPlayerCommando}
						disabled={(this.state.statusPlayer?.currentSong as CurrentSong)?.pos === 1}
					>
						<i className="fas fa-fw fa-fast-backward" />
					</button>
					<button
						title={i18next.t('PLAY_PAUSE')}
						id="status"
						data-namecommand={this.state.statusPlayer && this.state.statusPlayer.playerStatus === 'play' ? 'pause' : 'play'}
						className="btn btn-primary"
						onClick={this.play}
						disabled={this.state.statusPlayer?.playerStatus === 'pause' && this.props.currentPlaylist?.karacount === 0}
					>
						{this.state.statusPlayer?.playerStatus === 'play' ? <i className="fas fa-fw fa-pause" /> : <i className="fas fa-fw fa-play" />}
					</button>
					<button
						title={i18next.t('NEXT_SONG')}
						id="skip"
						data-namecommand="skip"
						className="btn btn-default"
						onClick={this.props.putPlayerCommando}
						disabled={(this.state.statusPlayer?.currentSong as CurrentSong)?.pos === this.props.currentPlaylist?.karacount}
					>
						<i className="fas fa-fw fa-fast-forward" />
					</button>
					<button
						title={i18next.t('REWIND')}
						id="goTo"
						data-namecommand="goTo"
						defaultValue="0"
						className="btn btn-danger-low rewindButton"
						onClick={this.props.putPlayerCommando}
					>
						<i className="fas fa-fw fa-undo-alt"/>
					</button>
				</div>

				<button
					title={i18next.t('MESSAGE')}
					id="adminMessage"
					className="btn btn-dark messageButton"
					onClick={this.props.adminMessage}
				>
					<i className="fas fa-fw fa-comment"/>
				</button>

				<button
					title={i18next.t(this.state.statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
					id="showSubs"
					data-namecommand={this.state.statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
					className={`btn btn-dark subtitleButton ${this.state.statusPlayer?.showSubs ? 'showSubs' : 'hideSubs'}`}
					onClick={this.props.putPlayerCommando}
				>
					<span className="fa-stack">
						<i className="fas fa-fw fa-closed-captioning fa-stack-1x"/>
						<i className="fas fa-fw fa-ban fa-stack-2x" style={{color: '#943d42', opacity: 0.7}}/>
					</span>
					<i className="fas fa-fw fa-closed-captioning"/>
				</button>
				<button
					type="button"
					title={i18next.t('MUTE_UNMUTE')}
					className="btn btn-dark volumeButton"
				>
					<div id="mute"
						data-namecommand={(volume === 0 || this.state.statusPlayer?.mute) ? 'unmute' : 'mute'}
						onClick={this.props.putPlayerCommando}
					>
						{
							volume === 0 || this.state.statusPlayer?.mute
								? <i className="fas fa-fw fa-volume-mute"/>
								: (
									volume > 66
										? <i className="fas fa-fw fa-volume-up"/>
										: (
											volume > 33
												? <i className="fas fa-fw fa-volume-down"/>
												: <i className="fas fa-fw fa-volume-off"/>
										)
								)
						}
					</div>
					<input
						title={i18next.t('VOLUME_LEVEL')}
						data-namecommand="setVolume"
						id="volume"
						defaultValue={volume}
						type="range"
						onMouseUp={this.props.putPlayerCommando}
					/>
				</button>
				<div
					className="dropdown"
				>
					<button
						className="btn btn-dark dropdown-toggle klogo"
						type="button"
						id="menuPC"
						onClick={() => this.setState({ dropDownMenu: !this.state.dropDownMenu })}
					/>
					{this.state.dropDownMenu ?
						<ul className="dropdown-menu">
							<li id="optionsButton">
								<a
									href="#"
									onClick={() => {
										this.props.setOptionMode();
										this.setState({ dropDownMenu: !this.state.dropDownMenu });
									}}
								>
									{this.props.options ?
										<React.Fragment>
											<i className="fas fa-fw fa-list-ul" />&nbsp;{i18next.t('CL_PLAYLISTS')}
										</React.Fragment> :
										<React.Fragment>
											<i className="fas fa-fw fa-cog" />&nbsp;{i18next.t('OPTIONS')}
										</React.Fragment>
									}
								</a>
							</li>
							<li>
								<a
									href="#"
									onClick={this.toggleProfileModal}
								>
									<i className="fas fa-fw fa-user" />&nbsp;{i18next.t('ACCOUNT')}
								</a>
							</li>
							<li>
								<a
									href="#"
									onClick={this.toggleUsersModal}
								>
									<i className="fas fa-fw fa-users" />&nbsp;{i18next.t('USERLIST')}
								</a>
							</li>
							<li>
								<a href="#" onClick={() => logout(this.context.globalDispatch)}
								>
									<i className="fas fa-fw fa-sign-out-alt" />&nbsp;{i18next.t('LOGOUT')}
								</a>
							</li>
							{this.props.powerOff ?
								<li>
									<a
										href="#"
										onClick={this.props.powerOff}
									>
										<i className="fas fa-fw fa-power-off" />&nbsp;{i18next.t('SHUTDOWN')}
									</a>
								</li> : null
							}
							<li className="buttonsMobileMenu">
								<a href="#" onClick={() => {
									this.props.adminMessage();
									this.setState({ dropDownMenu: !this.state.dropDownMenu });
								}}
								>
									<i className="fas fa-fw fa-comment" />&nbsp;{i18next.t('MESSAGE')}
								</a>
							</li>
							<li className="buttonsMobileMenu">
								<a
									href="#"
									onClick={(event) => {
										this.props.putPlayerCommando(event);
										this.setState({ dropDownMenu: !this.state.dropDownMenu });
									}}
									data-namecommand={this.state.statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
									id="showSubs"
								>
									<i className="fas fa-fw fa-closed-captioning"/>&nbsp;{i18next.t(this.state.statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
								</a>
							</li>
							<li className="buttonsMobileMenu">
								<a
									href="#"
									onClick={(event) => {
										this.props.putPlayerCommando(event);
										this.setState({ dropDownMenu: !this.state.dropDownMenu });
									}}
									id="goTo"
									data-namecommand="goTo"
								>
									<i className="fas fa-fw fa-undo-alt" />&nbsp;{i18next.t('REWIND')}
								</a>
							</li>
							<li className="buttonsMobileMenuSmaller">
								<a
									href="#"
									onClick={(event) => {
										this.props.putPlayerCommando(event);
										this.setState({ dropDownMenu: !this.state.dropDownMenu });
									}}
									id="mute"
									data-namecommand={(volume === 0 || this.state.statusPlayer?.mute) ? 'unmute' : 'mute'}
								>
									{
										volume === 0 || this.state.statusPlayer?.mute
											? <i className="fas fa-fw fa-volume-mute"/>
											: (
												volume > 66
													? <i className="fas fa-fw fa-volume-up"/>
													: (
														volume > 33
															? <i className="fas fa-fw fa-volume-down"/>
															: <i className="fas fa-fw fa-volume-off"/>
													)
											)
									}&nbsp;{i18next.t('MUTE_UNMUTE')}
								</a>
							</li>
							<li className="buttonsMobileMenuSmaller">
								{
									this.state.statusPlayer?.stopping ?
										<a
											href="#"
											onClick={(event) => {
												this.props.putPlayerCommando(event);
												this.setState({ dropDownMenu: !this.state.dropDownMenu });
											}}
											id="stopNow"
											data-namecommand="stopNow"
										>
											<i className="fas fa-fw fa-stop" />&nbsp;{i18next.t('STOP_NOW')}
										</a> :
										<a
											href="#"
											onClick={(event) => {
												this.props.putPlayerCommando(event);
												this.setState({ dropDownMenu: !this.state.dropDownMenu });
											}}
											id="stopAfter"
											data-namecommand="stopAfter"
										>
											<i className="fas fa-fw fa-stop" />&nbsp;{i18next.t('STOP_AFTER')}
										</a>

								}
							</li>
						</ul> : null
					}
				</div>
			</KmAppHeaderDecorator>
		);
	}
}

export default AdminHeader;

import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';

import { Config } from '../../../src/types/config';
import { PublicPlayerState } from '../../../src/types/state';
import store from '../store';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import RadioButton from './generic/RadioButton';
import { callModal, expand, getSocket } from './tools';

interface IProps {
	config: Config;
	options: boolean;
	currentSide: number;
	idsPlaylist: { left: number, right: number };
	currentPlaylist: PlaylistElem;
	toggleProfileModal: () => void;
	powerOff: (() => void) | undefined;
	adminMessage: () => void;
	putPlayerCommando: (event: any) => void;
	setOptionMode: () => void;
	changeCurrentSide: () => void;
}

interface IState {
	dropDownMenu: boolean;
	songVisibilityOperator: boolean;
	statusPlayer?: PublicPlayerState;
	frontendMode?: number;
}

class AdminHeader extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			dropDownMenu: false,
			songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin),
			frontendMode: this.props.config.Frontend.Mode
		};
	}


	async componentDidMount() {
		const result = await axios.get('/player');
		await this.setState({ statusPlayer: result.data });
		getSocket().on('playerStatus', (data: PublicPlayerState) => {
			let val = data.volume;
			const base = 100;
			const pow = 0.76;
			val = val / base;
			data.volume = base * Math.pow(val, 1 / pow);
			this.setState({ statusPlayer: data });
		});
	}

	componentDidUpdate(prevProps: IProps) {
		if (this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin
			!== prevProps.config.Playlist.MysterySongs.AddedSongVisibilityAdmin) {
			this.setState({ songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin) });
		}
	}

	saveOperatorAdd = (songVisibility: boolean) => {
		const data = expand('Playlist.MysterySongs.AddedSongVisibilityAdmin', songVisibility);
		this.setState({ songVisibilityOperator: songVisibility });
		axios.put('/settings', { setting: JSON.stringify(data) });
	};

	changePublicInterfaceMode = (value: number) => {
		const data = expand('Frontend.Mode', value);
		this.setState({ frontendMode: value });
		axios.put('/settings', { setting: JSON.stringify(data) });
	};

	play = (event: any) => {
		if ((!this.state.statusPlayer || this.state.statusPlayer?.playerStatus === 'stop')
			&& this.props.idsPlaylist.left !== this.props.currentPlaylist.playlist_id
			&& this.props.idsPlaylist.right !== this.props.currentPlaylist.playlist_id
			&& (this.props.idsPlaylist.left > 0 || this.props.idsPlaylist.right > 0)) {
			callModal('confirm', i18next.t('MODAL.PLAY_CURRENT_MODAL', { playlist: this.props.currentPlaylist.name }), '',
				() => axios.put('/player', { command: 'play' }));
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
						className="btn btn-default buttonsNotMobile"
						onClick={this.props.setOptionMode}
					>
						<i className="fas fa-long-arrow-alt-left "></i>
					</button> : null
				}
				<div className="header-group switchs">
					<label className="control-label" title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}>
						{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_SHORT')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
					</label>
					<label className="control-label" title={i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}>
						{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_SHORT')}
            &nbsp;
  					<i className="far fa-question-circle"></i>
					</label>
				</div>
				<div id="switchValue" className="header-group switchs">
					<RadioButton
						title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}
						buttons={[
							{
								label: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION'),
								active: this.state.songVisibilityOperator,
								activeColor: '#57bb00',
								onClick: () => this.saveOperatorAdd(true),

							},
							{
								label: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION'),
								active: !this.state.songVisibilityOperator,
								activeColor: '#994240',
								onClick: () => this.saveOperatorAdd(false),

							}
						]}
					/>
					<RadioButton
						title={i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}
						buttons={[
							{
								label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED_SHORT'),
								active: this.state.frontendMode === 0,
								activeColor: '#994240',
								onClick: () => this.changePublicInterfaceMode(0),

							},
							{
								label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED_SHORT'),
								active: this.state.frontendMode === 1,
								activeColor: '#37679a',
								onClick: () => this.changePublicInterfaceMode(1),

							},
							{
								label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN_SHORT'),
								active: this.state.frontendMode === 2,
								activeColor: '#57bb00',
								onClick: () => this.changePublicInterfaceMode(2),

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
								className="btn btn-danger"
								onClick={this.props.putPlayerCommando}
							>
								<i className="fas fa-stop"></i>
							</button> :
							<button
								title={i18next.t('STOP_AFTER')}
								id="stopAfter"
								data-namecommand="stopAfter"
								className="btn btn-danger-low"
								onClick={this.props.putPlayerCommando}
							>
								<i className="fas fa-stop"></i>
							</button>
					}
					<button
						title={i18next.t('PREVIOUS_SONG')}
						id="prev"
						data-namecommand="prev"
						className="btn btn-default"
						onClick={this.props.putPlayerCommando}
						disabled={this.state.statusPlayer?.currentSong?.pos === 1}
					>
						<i className="fas fa-fast-backward"></i>
					</button>
					<button
						title={i18next.t('PLAY_PAUSE')}
						id="status"
						data-namecommand={this.state.statusPlayer && this.state.statusPlayer.playerStatus === 'play' ? 'pause' : 'play'}
						className="btn btn-primary"
						onClick={this.play}
						disabled={this.props.currentPlaylist?.karacount === 0}
					>
						{this.state.statusPlayer && this.state.statusPlayer.playerStatus === 'play' ? (
							<i className="fas fa-pause"></i>
						) :
							(
								<i className="fas fa-play"></i>
							)}
					</button>
					<button
						title={i18next.t('NEXT_SONG')}
						id="skip"
						data-namecommand="skip"
						className="btn btn-default"
						onClick={this.props.putPlayerCommando}
						disabled={this.state.statusPlayer?.currentSong?.pos === this.state.statusPlayer?.currentSong?.playlistLength}
					>
						<i className="fas fa-fast-forward"></i>
					</button>
					<button
						title={i18next.t('REWIND')}
						id="goTo"
						data-namecommand="goTo"
						defaultValue="0"
						className="btn btn-danger-low"
						onClick={this.props.putPlayerCommando}
					>
						<i className="fas fa-undo-alt"></i>
					</button>
				</div>


				<button
					className={`btn btn-dark sideButton ${this.props.currentSide === 2 ? 'side2Button' : 'side1Button'}`}
					type="button" onClick={this.props.changeCurrentSide}>
					<i className="fas fa-tasks"></i>
				</button>
				<button
					title={i18next.t('MESSAGE')}
					id="adminMessage"
					className="btn btn-dark messageButton buttonsNotMobile"
					onClick={this.props.adminMessage}
				>
					<i className="fas fa-comment"></i>
				</button>

				<button
					title={i18next.t(this.state.statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
					id="showSubs"
					data-namecommand={this.state.statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
					className={`btn btn-dark subtitleButton buttonsNotMobile ${this.state.statusPlayer?.showSubs ? 'showSubs':'hideSubs'}`}
					onClick={this.props.putPlayerCommando}
				>
					<span className="fa-stack">
						<i className="fas fa-closed-captioning fa-stack-1x"></i>
						<i className="fas fa-ban fa-stack-2x" style={{ color: '#943d42', opacity: 0.7 }}></i>
					</span>
					<i className="fas fa-closed-captioning"></i>
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
								? <i className="fas fa-volume-mute"></i>
								: (
									volume > 66
										? <i className="fas fa-volume-up"></i>
										: (
											volume > 33
												? <i className="fas fa-volume-down"></i>
												: <i className="fas fa-volume-off"></i>
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
					className="dropdown buttonsNotMobile"
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
											<i className="fas fa-list-ul" />&nbsp;{i18next.t('CL_PLAYLISTS')}
										</React.Fragment> :
										<React.Fragment>
											<i className="fas fa-cog" />&nbsp;{i18next.t('OPTIONS')}
										</React.Fragment>
									}
								</a>
							</li>
							<li>
								<a
									href="#"
									onClick={() => {
										this.props.toggleProfileModal();
										this.setState({ dropDownMenu: !this.state.dropDownMenu });
									}}
								>
									<i className="fas fa-user" />&nbsp;{i18next.t('ACCOUNT')}
								</a>
							</li>
							<li>
								<a href="#" onClick={() => {
									store.logOut();
									this.props.toggleProfileModal();
								}}
								>
									<i className="fas fa-sign-out-alt" />&nbsp;{i18next.t('LOGOUT')}
								</a>
							</li>
							{this.props.powerOff ?
								<li>
									<a
										href="#"
										onClick={this.props.powerOff}
									>
										<i className="fas fa-power-off" />&nbsp;{i18next.t('SHUTDOWN')}
									</a>
								</li> : null
							}
						</ul> : null
					}
				</div>
			</KmAppHeaderDecorator>
		);
	}
}

export default AdminHeader;

import React, { Component } from 'react';
import i18next from 'i18next';
import { expand, getSocket, callModal } from './tools';
import axios from 'axios';
import RadioButton from './generic/RadioButton';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import store from '../store';
import { Config } from '../../../src/types/config';
import { PublicState } from '../../../src/types/state';

interface IProps {
	config: Config;
	options: boolean;
	currentSide: number;
	idsPlaylist: {left: number, right: number};
	currentPlaylist: PlaylistElem;
	toggleProfileModal: () => void;
	powerOff: (() => void) | undefined;
	adminMessage: () => void;
	putPlayerCommando: (event: any) => void;
	setOptionMode: () => void;
	changeCurrentSide: () => void;
}

interface IState {
	privateMode: boolean;
	dropDownMenu: boolean;
	songVisibilityOperator: boolean;
	statusPlayer?: PublicState;
}

class AdminHeader extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			privateMode: Boolean(this.props.config.Karaoke.Private),
			dropDownMenu: false,
			songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin)
		};
	}


	componentDidMount() {
		getSocket().on('playerStatus', (data:PublicState) => {
			var val = data.volume;
			var base = 100;
			var pow = 0.76;
			val = val / base;
			data.volume = base * Math.pow(val, 1 / pow);
			this.setState({ statusPlayer: data });
		});
	}

	componentDidUpdate(prevProps:IProps) {
		if (this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin
      !== prevProps.config.Playlist.MysterySongs.AddedSongVisibilityAdmin) {
			this.setState({ songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin)});
		}
	}

  saveMode = (mode:boolean) => {
  	var data = expand('Karaoke.Private', mode);
  	this.setState({ privateMode: mode });
  	axios.put('/settings', { setting: JSON.stringify(data) });
  };

  saveOperatorAdd = (songVisibility: boolean) => {
  	var data = expand('Playlist.MysterySongs.AddedSongVisibilityAdmin', songVisibility);
  	this.setState({ songVisibilityOperator: songVisibility });
  	axios.put('/settings', { setting: JSON.stringify(data) });
  };

  play = (event:any) => {
	if ((!this.state.statusPlayer || this.state.statusPlayer && this.state.statusPlayer.playerStatus === 'pause')
		&& this.props.idsPlaylist.left !== this.props.currentPlaylist.playlist_id
		&& this.props.idsPlaylist.right !== this.props.currentPlaylist.playlist_id
		&& (this.props.idsPlaylist.left > 0 || this.props.idsPlaylist.right > 0 )) {
		callModal('confirm', i18next.t('MODAL.PLAY_CURRENT_MODAL', {playlist: this.props.currentPlaylist.name}), '',
			() => axios.put('/player', {command: 'play'}));
	} else {
		this.props.putPlayerCommando(event);
	}
  }

  render() {
  	let volume:number = (this.state.statusPlayer && !isNaN(this.state.statusPlayer.volume)) ? this.state.statusPlayer.volume : 100;

  	return (
  		<KmAppHeaderDecorator mode="admin">
			<button
				className={`btn btn-dark sideButton ${this.props.currentSide === 2 ? 'side2Button' : 'side1Button'}`}
				type="button" onClick={this.props.changeCurrentSide}>
					<i className="fas fa-tasks"></i>
			</button>
			<div
				className="btn btn-default btn-dark buttonsNotMobile"
				id="manageButton"
			>
				<button
					className="btn btn-dark klogo"
					type="button"
					onClick={() => this.setState({dropDownMenu: !this.state.dropDownMenu})}
				/>
				{this.state.dropDownMenu ?
					<ul className="dropdown-menu">
						<li
							title={i18next.t('ACCOUNT')}
							className="btn btn-default btn-dark"
							onClick={this.props.toggleProfileModal}
						>
							<i className="fas fa-user"></i>
						</li>
						<li
							title={i18next.t('LOGOUT')} onClick={() => {
								store.logOut();
								this.props.toggleProfileModal();
								}}
							className="btn btn-default btn-dark"
						>
							<i className="fas fa-sign-out-alt"></i>
						</li>
						{this.props.powerOff ?
							<li
								title={i18next.t('SHUTDOWN')}
								className="btn btn-default btn-dark"
								onClick={this.props.powerOff}
							>
								<i className="fas fa-power-off"></i>
							</li> : null
  						}
					</ul> : null
				}
			</div>

			<button
				title={i18next.t('MESSAGE')}
				id="adminMessage"
				className="btn btn-dark messageButton buttonsNotMobile"
				onClick={this.props.adminMessage}
			>
				<i className="fas fa-comment"></i>
			</button>

			<button
				title={i18next.t('SHOW_HIDE_SUBS')}
				id="showSubs"
				data-namecommand={this.state.statusPlayer && this.state.statusPlayer.showSubs ? 'hideSubs' : 'showSubs'}
				className="btn btn-dark subtitleButton buttonsNotMobile"
				onClick={this.props.putPlayerCommando}
			>
				{this.state.statusPlayer && this.state.statusPlayer.showSubs ? (
					<i className="fas fa-closed-captioning"></i>
				) : (
					<span className="fa-stack">
						<i className="fas fa-closed-captioning fa-stack-1x"></i>
						<i className="fas fa-ban fa-stack-2x" style={{color:'#943d42',opacity:0.7}}></i>
					</span>
				)}
			</button>
  			<button
  				type="button"
  				title={i18next.t('MUTE_UNMUTE')}
				className="btn btn-dark volumeButton"
  			>
				<div id="mute"
					data-namecommand={(volume === 0 || (this.state.statusPlayer && this.state.statusPlayer.mute))  ? "unmute" : "mute"}
				 	onClick={this.props.putPlayerCommando}
				>
					{
						volume === 0 || this.state.statusPlayer && this.state.statusPlayer.mute
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

  			<div className="header-group switchs" id="optionsButton">
  				<RadioButton
  					title={i18next.t('SWITCH_OPTIONS')}
  					orientation="vertical"
  					buttons={[
  						{
  							label:i18next.t('CL_PLAYLISTS'),
  							active:!this.props.options,
  							onClick:this.props.setOptionMode,
  						},
  						{
  							label:i18next.t('OPTIONS'),
  							active:this.props.options,
  							onClick:this.props.setOptionMode,
  						}
  					]}
  				></RadioButton>
  			</div>
  			<div className="header-group switchs" id="KaraokePrivate">
  				<RadioButton
  					title={i18next.t('SWITCH_PRIVATE')}
  					orientation="vertical"
  					buttons={[
  						{
  							label:i18next.t('PRIVATE'),
  							active:this.state.privateMode,
  							activeColor:'#994240',
  							onClick:() => this.saveMode(true),
  						},
  						{
  							label:i18next.t('PUBLIC'),
  							active:!this.state.privateMode,
  							activeColor:'#57bb00',
  							onClick:() => this.saveMode(false),
  						}
  					]}
  				></RadioButton>
  			</div>
			<div className="header-group switchs visibilitySwitch">
				<RadioButton
					title={i18next.t('ENGINE_ADDED_SONG_VISIBILITY_ADMIN')}
					orientation="vertical"
					buttons={[
						{
							label:i18next.t('ADMIN_PANEL_ADDED_SONG_VISIBILITY_NORMAL'),
							active:this.state.songVisibilityOperator,
							activeColor:'#57bb00',
							onClick:() => this.saveOperatorAdd(true),

						},
						{
							label:i18next.t('ADMIN_PANEL_ADDED_SONG_VISIBILITY_MYSTERY'),
							active:!this.state.songVisibilityOperator,
							activeColor:'#994240',
							onClick:() => this.saveOperatorAdd(false),

						}
					]}
				></RadioButton>
			</div>
  			<button
  				title={i18next.t('STOP_AFTER')}
  				id="stopAfter"
  				data-namecommand="stopAfter"
  				className="btn btn-danger-low"
  				onClick={this.props.putPlayerCommando}
  			>
  				<i className="fas fa-clock"></i>
  			</button>
			<button
				title={i18next.t('STOP_NOW')}
				id="stopNow"
				data-namecommand="stopNow"
				className="btn btn-danger buttonsNotMobile"
				onClick={this.props.putPlayerCommando}
			>
				<i className="fas fa-stop"></i>
			</button>
			<button
				title={i18next.t('REWIND')}
				id="goTo"
				data-namecommand="goTo"
				defaultValue="0"
				className="btn btn-dark buttonsNotMobile"
				onClick={this.props.putPlayerCommando}
			>
				<i className="fas fa-backward"></i>
			</button>
  			<div className="header-group controls">
  				<button
  					title={i18next.t('PREVIOUS_SONG')}
  					id="prev"
  					data-namecommand="prev"
  					className="btn btn-default"
  					onClick={this.props.putPlayerCommando}
  				>
  					<i className="fas fa-chevron-left"></i>
  				</button>
  				<button
  					title={i18next.t('PLAY_PAUSE')}
  					id="status"
  					data-namecommand={this.state.statusPlayer && this.state.statusPlayer.playerStatus === 'play' ? 'pause' : 'play'}
  					className="btn btn-primary"
  					onClick={this.play}
  				>
  					{this.state.statusPlayer && this.state.statusPlayer.playerStatus === 'play' ? (
  						<i className="fas fa-pause"></i>
  					) : (
  						<i className="fas fa-play"></i>
  					)}
  				</button>
  				<button
  					title={i18next.t('NEXT_SONG')}
  					id="skip"
  					data-namecommand="skip"
  					className="btn btn-default"
  					onClick={this.props.putPlayerCommando}
  				>
  					<i className="fas fa-chevron-right"></i>
  				</button>
  			</div>
  		</KmAppHeaderDecorator>
  	);
  }
}

export default AdminHeader;

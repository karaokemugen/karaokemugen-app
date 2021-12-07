import i18next from 'i18next';
import merge from 'lodash.merge';
import { useContext, useEffect, useState } from 'react';
import { render } from 'react-dom';
import { RouteComponentProps, withRouter } from 'react-router';

import { CurrentSong } from '../../../../src/types/playlist';
import { PublicPlayerState } from '../../../../src/types/state';
import KLogo from '../../assets/Klogo.png';
import { logout } from '../../store/actions/auth';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { commandBackend, getSocket } from '../../utils/socket';
import { callModal, displayMessage, expand, isNonStandardPlaylist } from '../../utils/tools';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import RadioButton from './generic/RadioButton';
import ProfilModal from './modals/ProfilModal';
import Tutorial from './modals/Tutorial';
import UsersModal from './modals/UsersModal';

interface IProps extends RouteComponentProps {
	currentPlaylist: PlaylistElem;
	powerOff: (() => void) | undefined;
	adminMessage: () => void;
	putPlayerCommando: (event: any) => void;
}

function AdminHeader(props: IProps) {
	const context = useContext(GlobalContext);
	const [dropDownSettings, setDropDownSettings] = useState(false);
	const [dropDownMenu, setDropDownMenu] = useState(false);
	const [statusPlayer, setStatusPlayer] = useState<PublicPlayerState>();

	const closeDropdownMenu = (e: MouseEvent) => {
		if (!(e.target as Element).closest('.klogo') && !(e.target as Element).closest('.dropdown-menu')) {
			setDropDownMenu(false);
		}
		if (!(e.target as Element).closest('.dropdown-settings') && !(e.target as Element).closest('.dropdown-menu')) {
			setDropDownSettings(false);
		}
	};

	const playerUpdate = (data: PublicPlayerState) => {
		let val = data.volume;
		const base = 100;
		const pow = 0.76;
		val = val / base;
		if (!isNaN(val)) data.volume = base * Math.pow(val, 1 / pow);
		setStatusPlayer(oldState => {
			const state = { ...oldState };
			return merge(state, data);
		});
	};

	const toggleProfileModal = () => {
		setDropDownMenu(!dropDownMenu);
		// Prohibit online user editing when online is unavailable
		// onlineAvailable is undefined for local users
		if (context.globalState.auth.data.onlineAvailable !== false) {
			showModal(context.globalDispatch, <ProfilModal scope="admin" />);
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.USER_ONLINE_NOINTERNET'), 5000);
		}
	};

	const toggleUsersModal = () => {
		setDropDownMenu(!dropDownMenu);
		showModal(context.globalDispatch, <UsersModal scope="admin" />);
	};

	const saveOperatorAdd = (songVisibility: boolean) => {
		const data = expand('Playlist.MysterySongs.AddedSongVisibilityAdmin', songVisibility);
		commandBackend('updateSettings', { setting: data }).catch(() => {});
	};

	const changePublicInterfaceMode = (value: number) => {
		const data = expand('Frontend.Mode', value);
		commandBackend('updateSettings', { setting: data }).catch(() => {});
	};

	const changeLiveComments = (liveComments: boolean) => {
		const data = expand('Player.LiveComments', liveComments);
		commandBackend('updateSettings', { setting: data }).catch(() => {});
	};

	const play = (event: any) => {
		if (
			(!statusPlayer || statusPlayer?.playerStatus === 'stop') &&
			context.globalState.frontendContext.playlistInfoLeft.plaid !== props.currentPlaylist?.plaid &&
			context.globalState.frontendContext.playlistInfoRight.plaid !== props.currentPlaylist?.plaid &&
			(!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoLeft.plaid) ||
				!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoRight.plaid))
		) {
			callModal(
				context.globalDispatch,
				'confirm',
				i18next.t('MODAL.PLAY_CURRENT_MODAL', { playlist: props.currentPlaylist.name }),
				'',
				() => commandBackend('sendPlayerCommand', { command: 'play' }).catch(() => {})
			);
		} else {
			props.putPlayerCommando(event);
		}
	};

	const getPlayerStatus = async () => {
		try {
			const result = await commandBackend('getPlayerStatus');
			playerUpdate(result);
		} catch (e) {
			// already display
		}
	};

	useEffect(() => {
		if (context.globalState.auth.isAuthenticated) {
			getPlayerStatus();
		}
		getSocket().on('playerStatus', playerUpdate);
		document.getElementById('root').addEventListener('click', closeDropdownMenu);
		return () => {
			getSocket().off('playerStatus', playerUpdate);
			document.getElementById('root').removeEventListener('click', closeDropdownMenu);
		};
	}, []);

	const setVolume = event => {
		setStatusPlayer(oldState => {
			const state = { ...oldState };
			state.volume = event.target.value;
			return state;
		});
	};

	return (
		<KmAppHeaderDecorator mode="admin">
			{props.location.pathname.includes('/options') ? (
				<button
					title={i18next.t('BACK_PLAYLISTS')}
					className="btn btn-default"
					onClick={() => props.history.push('/admin')}
				>
					<i className="fas fa-fw fa-long-arrow-alt-left" />
				</button>
			) : null}
			<div className="dropdown-settings">
				<button
					className="btn btn-dark"
					type="button"
					title={i18next.t('ADMIN_HEADER.QUICK_ACCESS')}
					onClick={() => setDropDownSettings(!dropDownSettings)}
				>
					<i className="fas fa-fw fa-sliders-h" />
				</button>
				{dropDownSettings ? (
					<ul className="dropdown-menu">
						<li title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}>
							<label>
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_SHORT')}
								&nbsp;
								<i className="far fa-question-circle" />
							</label>
							<RadioButton
								buttons={[
									{
										label: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION'),
										active: context?.globalState.settings.data.config?.Playlist?.MysterySongs
											.AddedSongVisibilityAdmin,
										activeColor: '#3c5c00',
										onClick: () => saveOperatorAdd(true),
										description: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_OFF'),
									},
									{
										label: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION'),
										active: !context?.globalState.settings.data.config?.Playlist?.MysterySongs
											.AddedSongVisibilityAdmin,
										activeColor: '#880500',
										onClick: () => saveOperatorAdd(false),
										description: i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_ON'),
									},
								]}
							/>
						</li>
						<li title={i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}>
							<label>
								{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_SHORT')}
								&nbsp;
								<i className="far fa-question-circle" />
							</label>
							<RadioButton
								buttons={[
									{
										label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED_SHORT'),
										active: context?.globalState.settings.data.config?.Frontend?.Mode === 0,
										activeColor: '#880500',
										onClick: () => changePublicInterfaceMode(0),
										description: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED'),
									},
									{
										label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED_SHORT'),
										active: context?.globalState.settings.data.config?.Frontend?.Mode === 1,
										activeColor: '#a36700',
										onClick: () => changePublicInterfaceMode(1),
										description: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED'),
									},
									{
										label: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN_SHORT'),
										active: context?.globalState.settings.data.config?.Frontend?.Mode === 2,
										activeColor: '#3c5c00',
										onClick: () => changePublicInterfaceMode(2),
										description: i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN'),
									},
								]}
							/>
						</li>
						{context?.globalState.settings.data.config?.Karaoke?.StreamerMode?.Twitch?.Enabled ? (
							<li title={i18next.t('SETTINGS.PLAYER.LIVE_COMMENTS_TOOLTIP')}>
								<label>
									{i18next.t('SETTINGS.PLAYER.LIVE_COMMENTS')}
									&nbsp;
									<i className="far fa-question-circle" />
								</label>
								<RadioButton
									buttons={[
										{
											label: i18next.t('YES'),
											active: context?.globalState.settings.data.config?.Player?.LiveComments,
											activeColor: '#3c5c00',
											onClick: () => changeLiveComments(true),
										},
										{
											label: i18next.t('NO'),
											active: !context?.globalState.settings.data.config?.Player?.LiveComments,
											activeColor: '#880500',
											onClick: () => changeLiveComments(false),
										},
									]}
								/>
							</li>
						) : null}
					</ul>
				) : null}
			</div>
			<div className="header-group controls">
				{statusPlayer?.stopping || statusPlayer?.streamerPause ? (
					<button
						title={i18next.t('STOP_NOW')}
						id="stopNow"
						data-namecommand="stopNow"
						className="btn btn-danger stopButton"
						onClick={props.putPlayerCommando}
					>
						<i className="fas fa-fw fa-stop" />
					</button>
				) : (
					<button
						title={i18next.t('STOP_AFTER')}
						id="stopAfter"
						data-namecommand="stopAfter"
						className="btn btn-danger-low stopButton"
						onClick={props.putPlayerCommando}
					>
						<i className="fas fa-fw fa-stop" />
					</button>
				)}
				<button
					title={i18next.t('PREVIOUS_SONG')}
					id="prev"
					data-namecommand="prev"
					className="btn btn-default"
					onClick={props.putPlayerCommando}
					disabled={(statusPlayer?.currentSong as CurrentSong)?.pos === 1}
				>
					<i className="fas fa-fw fa-fast-backward" />
				</button>
				<button
					title={i18next.t('PLAY_PAUSE')}
					id="status"
					data-namecommand={statusPlayer && statusPlayer.playerStatus === 'play' ? 'pause' : 'play'}
					className="btn btn-primary"
					onClick={play}
				>
					{statusPlayer?.playerStatus === 'play' ? (
						<i className="fas fa-fw fa-pause" />
					) : (
						<i className="fas fa-fw fa-play" />
					)}
				</button>
				<button
					title={i18next.t('NEXT_SONG')}
					id="skip"
					data-namecommand="skip"
					className="btn btn-default"
					onClick={props.putPlayerCommando}
					disabled={(statusPlayer?.currentSong as CurrentSong)?.pos === props.currentPlaylist?.karacount}
				>
					<i className="fas fa-fw fa-fast-forward" />
				</button>
				<button
					title={i18next.t('REWIND')}
					id="goTo"
					data-namecommand="goTo"
					defaultValue="0"
					className="btn btn-danger-low rewindButton"
					onClick={props.putPlayerCommando}
				>
					<i className="fas fa-fw fa-undo-alt" />
				</button>
			</div>

			<button
				title={i18next.t('MESSAGE')}
				id="adminMessage"
				className="btn btn-dark messageButton"
				onClick={props.adminMessage}
			>
				<i className="fas fa-fw fa-comment" />
			</button>

			<button
				title={i18next.t(statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
				id="showSubs"
				data-namecommand={statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
				className={`btn btn-dark subtitleButton ${statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}`}
				onClick={props.putPlayerCommando}
			>
				<span className="fa-stack">
					<i className="fas fa-fw fa-closed-captioning fa-stack-1x" />
					<i className="fas fa-fw fa-ban fa-stack-2x" style={{ color: '#943d42', opacity: 0.7 }} />
				</span>
				<i className="fas fa-fw fa-closed-captioning" />
			</button>
			<button type="button" title={i18next.t('MUTE_UNMUTE')} className="btn btn-dark volumeButton">
				<div
					id="mute"
					data-namecommand={statusPlayer?.volume === 0 || statusPlayer?.mute ? 'unmute' : 'mute'}
					onClick={props.putPlayerCommando}
				>
					{statusPlayer?.volume === 0 || statusPlayer?.mute ? (
						<i className="fas fa-fw fa-volume-mute" />
					) : statusPlayer?.volume > 66 ? (
						<i className="fas fa-fw fa-volume-up" />
					) : statusPlayer?.volume > 33 ? (
						<i className="fas fa-fw fa-volume-down" />
					) : (
						<i className="fas fa-fw fa-volume-off" />
					)}
				</div>
				{statusPlayer ? (
					<input
						title={i18next.t('VOLUME_LEVEL')}
						data-namecommand="setVolume"
						id="volume"
						value={statusPlayer.volume}
						type="range"
						onChange={setVolume}
						onMouseUp={props.putPlayerCommando}
					/>
				) : null}
			</button>
			<div className="dropdown">
				<button className="btn btn-dark klogo" type="button" onClick={() => setDropDownMenu(!dropDownMenu)}>
					<img src={KLogo} alt="Karaoke Mugen logo" />
				</button>
				{dropDownMenu ? (
					<ul className="dropdown-menu">
						<li>
							<a
								href={`/admin${props.location.pathname.includes('/options') ? '' : '/options'}`}
								onClick={e => {
									e.preventDefault();
									props.history.push(
										`/admin${props.location.pathname.includes('/options') ? '' : '/options'}`
									);
									setDropDownMenu(!dropDownMenu);
								}}
							>
								{props.location.pathname.includes('/options') ? (
									<>
										<i className="fas fa-fw fa-list-ul" />
										&nbsp;{i18next.t('CL_PLAYLISTS')}
									</>
								) : (
									<>
										<i className="fas fa-fw fa-cog" />
										&nbsp;{i18next.t('OPTIONS')}
									</>
								)}
							</a>
						</li>
						<li>
							<a href="#" onClick={toggleProfileModal}>
								<i className="fas fa-fw fa-user" />
								&nbsp;{i18next.t('ACCOUNT')}
							</a>
						</li>
						<li>
							<a href="#" onClick={toggleUsersModal}>
								<i className="fas fa-fw fa-users" />
								&nbsp;{i18next.t('USERLIST')}
							</a>
						</li>
						<li>
							<a href="#" onClick={() => logout(context.globalDispatch)}>
								<i className="fas fa-fw fa-sign-out-alt" />
								&nbsp;{i18next.t('LOGOUT')}
							</a>
						</li>
						<li>
							<a
								href="#"
								onClick={() => {
									render(<Tutorial />, document.getElementById('tuto'));
									setDropDownMenu(!dropDownMenu);
								}}
							>
								<i className="fas fa-fw fa-question-circle" />
								&nbsp;{i18next.t('MODAL.TUTORIAL.TITLE')}
							</a>
						</li>
						<li>
							<a href="/welcome">
								<i className="fas fa-fw fa-home" />
								&nbsp;{i18next.t('CHANGE_INTERFACE')}
							</a>
						</li>
						{props.powerOff ? (
							<li>
								<a href="#" onClick={props.powerOff}>
									<i className="fas fa-fw fa-power-off" />
									&nbsp;{i18next.t('SHUTDOWN')}
								</a>
							</li>
						) : null}
						<li className="buttonsMobileMenu">
							<a
								href="#"
								onClick={() => {
									props.adminMessage();
									setDropDownMenu(!dropDownMenu);
								}}
							>
								<i className="fas fa-fw fa-comment" />
								&nbsp;{i18next.t('MESSAGE')}
							</a>
						</li>
						<li className="buttonsMobileMenu">
							<a
								href="#"
								onClick={event => {
									props.putPlayerCommando(event);
									setDropDownMenu(!dropDownMenu);
								}}
								data-namecommand={statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
								id="showSubs"
							>
								<i className="fas fa-fw fa-closed-captioning" />
								&nbsp;{i18next.t(statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
							</a>
						</li>
						<li className="buttonsMobileMenu">
							<a
								href="#"
								onClick={event => {
									props.putPlayerCommando(event);
									setDropDownMenu(!dropDownMenu);
								}}
								id="goTo"
								data-namecommand="goTo"
							>
								<i className="fas fa-fw fa-undo-alt" />
								&nbsp;{i18next.t('REWIND')}
							</a>
						</li>
						<li className="buttonsMobileMenuSmaller">
							<a
								href="#"
								onClick={event => {
									props.putPlayerCommando(event);
									setDropDownMenu(!dropDownMenu);
								}}
								id="mute"
								data-namecommand={statusPlayer?.volume === 0 || statusPlayer?.mute ? 'unmute' : 'mute'}
							>
								{statusPlayer?.volume === 0 || statusPlayer?.mute ? (
									<i className="fas fa-fw fa-volume-mute" />
								) : statusPlayer?.volume > 66 ? (
									<i className="fas fa-fw fa-volume-up" />
								) : statusPlayer?.volume > 33 ? (
									<i className="fas fa-fw fa-volume-down" />
								) : (
									<i className="fas fa-fw fa-volume-off" />
								)}
								&nbsp;{i18next.t('MUTE_UNMUTE')}
							</a>
						</li>
						<li className="buttonsMobileMenuSmaller">
							{statusPlayer?.stopping || statusPlayer?.streamerPause ? (
								<a
									href="#"
									onClick={event => {
										props.putPlayerCommando(event);
										setDropDownMenu(!dropDownMenu);
									}}
									id="stopNow"
									data-namecommand="stopNow"
								>
									<i className="fas fa-fw fa-stop" />
									&nbsp;{i18next.t('STOP_NOW')}
								</a>
							) : (
								<a
									href="#"
									onClick={event => {
										props.putPlayerCommando(event);
										setDropDownMenu(!dropDownMenu);
									}}
									id="stopAfter"
									data-namecommand="stopAfter"
								>
									<i className="fas fa-fw fa-stop" />
									&nbsp;{i18next.t('STOP_AFTER')}
								</a>
							)}
						</li>
					</ul>
				) : null}
			</div>
		</KmAppHeaderDecorator>
	);
}

export default withRouter(AdminHeader);

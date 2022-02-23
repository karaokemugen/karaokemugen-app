import i18next from 'i18next';
import { merge } from 'lodash';
import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PublicPlayerState } from '../../../../src/types/state';
import nanamiSingPng from '../../assets/nanami-sing.png';
import nanamiSingWebp from '../../assets/nanami-sing.webp';
import { login } from '../../store/actions/auth';
import GlobalContext from '../../store/context';
import { sendIPC } from '../../utils/electron';
import { commandBackend, getSocket } from '../../utils/socket';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import AdminButtons from './karas/AdminButtons';
import ProgressBar from './karas/ProgressBar';

function ChibiPage() {
	const context = useContext(GlobalContext);
	const [searchParams] = useSearchParams();

	const [statusPlayer, setStatusPlayer] = useState<PublicPlayerState>();
	const [playlistList, setPlaylistList] = useState<PlaylistElem[]>([]);

	const getPlaylistList = async () => {
		const res = await commandBackend('getPlaylists');
		setPlaylistList(res);
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

	const putPlayerCommando = (event: any) => {
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
				options: 0,
			};
		} else {
			data = {
				command: namecommand,
			};
		}
		commandBackend('sendPlayerCommand', data).catch(() => {});
	};

	const electronCmd = (event: any) => {
		const namecommand = event.currentTarget.getAttribute('data-namecommand');
		return sendIPC(namecommand);
	};

	const setVolume = event => {
		const state = { ...statusPlayer };
		state.volume = event.target.value;
		setStatusPlayer(state);
	};

	const displayChibiPage = async () => {
		const admpwd = searchParams.get('admpwd');
		if (admpwd && !context.globalState.auth.isAuthenticated) {
			await login('admin', admpwd, context.globalDispatch);
		}
		if (context.globalState.auth.isAuthenticated) {
			getSocket().on('playerStatus', playerUpdate);
			try {
				const result = await commandBackend('getPlayerStatus');
				playerUpdate(result);
			} catch (e) {
				// already display
			}
			await getPlaylistList();
		}
	};

	useEffect(() => {
		displayChibiPage();
	}, []);

	return (
		<>
			<KmAppWrapperDecorator chibi>
				<div className="header-group floating-controls">
					<p>
						<picture>
							<source type="image/webp" srcSet={nanamiSingWebp} />
							<source type="image/png" srcSet={nanamiSingPng} />
							<img src={nanamiSingPng} alt="Nanami logo" />
						</picture>
						Karaoke Mugen Chibi Player
					</p>
					<button
						className="btn"
						title={i18next.t('CHIBI.FOCUS')}
						data-namecommand="focusMainWindow"
						onClick={electronCmd}
					>
						<i className="fas fa-fw fa-external-link-alt" />
					</button>
					<button
						className={`btn${
							context.globalState.settings.data.config.GUI.ChibiPlayer.AlwaysOnTop ? ' btn-primary' : ''
						}`}
						title={i18next.t('CHIBI.ONTOP')}
						data-namecommand="setChibiPlayerAlwaysOnTop"
						onClick={electronCmd}
					>
						<i className="fas fa-fw fa-window-restore" />
					</button>
					<button
						className="btn btn-danger"
						title={i18next.t('CHIBI.CLOSE')}
						data-namecommand="closeChibiPlayer"
						onClick={electronCmd}
					>
						<i className="fas fa-fw fa-times" />
					</button>
				</div>
				<KmAppHeaderDecorator mode="admin">
					<div className="header-group controls">
						<button type="button" title={i18next.t('MUTE_UNMUTE')} className="btn btn-dark volumeButton">
							<div
								id="mute"
								data-namecommand={statusPlayer?.volume === 0 || statusPlayer?.mute ? 'unmute' : 'mute'}
								onClick={putPlayerCommando}
							>
								{statusPlayer?.volume === 0 || statusPlayer?.mute ? (
									<i className="fas fa-volume-mute"></i>
								) : statusPlayer?.volume > 66 ? (
									<i className="fas fa-volume-up"></i>
								) : statusPlayer?.volume > 33 ? (
									<i className="fas fa-volume-down"></i>
								) : (
									<i className="fas fa-volume-off"></i>
								)}
							</div>
							<input
								title={i18next.t('VOLUME_LEVEL')}
								data-namecommand="setVolume"
								id="volume"
								value={statusPlayer?.volume}
								type="range"
								onChange={setVolume}
								onMouseUp={putPlayerCommando}
							/>
						</button>
						<AdminButtons
							putPlayerCommando={putPlayerCommando}
							statusPlayer={statusPlayer}
							currentPlaylist={playlistList.find(playlistElem => playlistElem.flag_current)}
						/>
						<button
							title={i18next.t(statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
							id="showSubs"
							data-namecommand={statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
							className={`btn btn-dark subtitleButton ${
								statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'
							}`}
							onClick={putPlayerCommando}
						>
							<span className="fa-stack">
								<i className="fas fa-closed-captioning fa-stack-1x" />
								<i className="fas fa-ban fa-stack-2x" style={{ color: '#943d42', opacity: 0.7 }} />
							</span>
							<i className="fas fa-closed-captioning" />
						</button>
					</div>
				</KmAppHeaderDecorator>
				<ProgressBar />
			</KmAppWrapperDecorator>
		</>
	);
}

export default ChibiPage;

import {
	faBackwardFast,
	faForward,
	faForwardFast,
	faPause,
	faPlay,
	faStop,
	faUndoAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { DBPL } from '../../../../src/types/database/playlist';
import { CurrentSong } from '../../../../src/types/playlist';
import { PublicPlayerState } from '../../../../src/types/state';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { commandBackend, getSocket } from '../../utils/socket';
import { is_touch_device, isNonStandardPlaylist } from '../../utils/tools';
import PlayCurrentModal from './modals/PlayCurrentModal';
import { WS_CMD } from '../../utils/ws.mjs';

interface IProps {
	currentPlaylist: DBPL;
	statusPlayer: PublicPlayerState;
	scope: 'admin' | 'public' | 'chibi';
	putPlayerCommando: (event: any) => void;
}

function PlayerControls(props: IProps) {
	const context = useContext(GlobalContext);
	const [gameContinue, setGameContinue] = useState(false);

	const play = (event: any) => {
		if (
			props.scope === 'admin' &&
			props.currentPlaylist &&
			(!props.statusPlayer || props.statusPlayer?.playerStatus === 'stop') &&
			context.globalState.frontendContext.playlistInfoLeft.plaid !== props.currentPlaylist?.plaid &&
			context.globalState.frontendContext.playlistInfoRight.plaid !== props.currentPlaylist?.plaid &&
			(!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoLeft.plaid) ||
				!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoRight.plaid))
		) {
			showModal(
				context.globalDispatch,
				<PlayCurrentModal
					currentPlaylist={props.currentPlaylist}
					displayedPlaylist={
						!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoRight.plaid)
							? context.globalState.frontendContext.playlistInfoRight
							: context.globalState.frontendContext.playlistInfoLeft
					}
				/>
			);
		} else {
			props.putPlayerCommando(event);
		}
	};

	const toggleGameContinue = () => {
		commandBackend(WS_CMD.CONTINUE_GAME_SONG).then(setGameContinue);
	};

	const qStart = () => {
		setGameContinue(false);
	};

	useEffect(() => {
		if (props.scope !== 'public') getSocket().on('quizStart', qStart);
		return () => {
			if (props.scope !== 'public') getSocket().off('quizStart', qStart);
		};
	}, []);

	const quizInProgress = context.globalState.settings.data.state.quiz.running;

	return props.scope === 'public' ? (
		<>
			{props.statusPlayer?.stopping ||
			props.statusPlayer?.mediaType !== 'song' ||
			context?.globalState.settings.data.config?.Karaoke.ClassicMode ? (
				<div className="red" data-namecommand="stopNow" onClick={props.putPlayerCommando}>
					<FontAwesomeIcon icon={faStop} className="fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.STOP_NOW_SHORT')}
				</div>
			) : (
				<div className="red" data-namecommand="stopAfter" onClick={props.putPlayerCommando}>
					<FontAwesomeIcon icon={faStop} className="fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.STOP_AFTER_SHORT')}
				</div>
			)}
			{(props.statusPlayer?.currentSong as CurrentSong)?.pos !== 1 ? (
				<div className="white" data-namecommand="prev" onClick={props.putPlayerCommando}>
					<FontAwesomeIcon icon={faBackwardFast} className="fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.PREVIOUS_SONG_SHORT')}
				</div>
			) : null}
			{props.statusPlayer?.playerStatus === 'play' ? (
				<div className="blue" data-namecommand="pause" onClick={play}>
					<FontAwesomeIcon icon={faPause} className="fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.PAUSE')}
				</div>
			) : (
				<div className="blue" data-namecommand="play" onClick={play}>
					<FontAwesomeIcon icon={faPlay} className="fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.PLAY')}
				</div>
			)}
			{(props.statusPlayer?.currentSong as CurrentSong)?.pos !== props.currentPlaylist?.karacount ? (
				<div data-namecommand="skip" className="white" onClick={props.putPlayerCommando}>
					<FontAwesomeIcon icon={faForwardFast} className="fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.NEXT_SONG_SHORT')}
				</div>
			) : null}
		</>
	) : (
		<>
			{props.statusPlayer?.stopping ||
			props.statusPlayer?.mediaType !== 'song' ||
			context?.globalState.settings.data.config?.Karaoke.ClassicMode ? (
				<button
					title={i18next.t('PLAYERS_CONTROLS.STOP_NOW')}
					data-namecommand="stopNow"
					className="btn btn-danger stopButton"
					onClick={props.putPlayerCommando}
				>
					<FontAwesomeIcon icon={faStop} />
				</button>
			) : (
				<button
					title={i18next.t('PLAYERS_CONTROLS.STOP_AFTER')}
					data-namecommand="stopAfter"
					className="btn stopButton"
					onClick={props.putPlayerCommando}
				>
					<FontAwesomeIcon icon={faStop} />
				</button>
			)}
			<button
				title={i18next.t('PLAYERS_CONTROLS.PREVIOUS_SONG')}
				data-namecommand="prev"
				className="btn btn-default"
				onClick={props.putPlayerCommando}
				disabled={(props.statusPlayer?.currentSong as CurrentSong)?.pos === 1}
			>
				<FontAwesomeIcon icon={faBackwardFast} />
			</button>
			{props.statusPlayer?.playerStatus === 'play' ? (
				<button
					title={i18next.t('PLAYERS_CONTROLS.PAUSE')}
					data-namecommand="pause"
					className="btn btn-primary"
					onClick={play}
				>
					<FontAwesomeIcon icon={faPause} />
				</button>
			) : (
				<button
					title={i18next.t('PLAYERS_CONTROLS.PLAY')}
					data-namecommand="play"
					className="btn btn-primary"
					onClick={play}
				>
					<FontAwesomeIcon icon={faPlay} />
				</button>
			)}
			<button
				title={i18next.t('PLAYERS_CONTROLS.NEXT_SONG')}
				data-namecommand="skip"
				className="btn btn-default"
				onClick={props.putPlayerCommando}
				disabled={(props.statusPlayer?.currentSong as CurrentSong)?.pos === props.currentPlaylist?.karacount}
			>
				<FontAwesomeIcon icon={faForwardFast} />
			</button>
			{quizInProgress ? (
				<button
					title={i18next.t('QUIZ.CONTINUE')}
					className={`btn ${gameContinue ? 'btn-primary' : ''}`}
					onClick={toggleGameContinue}
				>
					<FontAwesomeIcon icon={faForward} />
				</button>
			) : (
				<button
					title={i18next.t('PLAYERS_CONTROLS.REWIND')}
					data-namecommand="goTo"
					defaultValue="0"
					className="btn btn-danger-low rewindButton"
					onClick={props.putPlayerCommando}
				>
					<FontAwesomeIcon icon={faUndoAlt} />
				</button>
			)}
		</>
	);
}

export default PlayerControls;

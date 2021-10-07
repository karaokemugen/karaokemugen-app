import i18next from 'i18next';
import React from 'react';

import { CurrentSong } from '../../../../../src/types/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';

interface IProps {
	putPlayerCommando: (event: any) => void;
	statusPlayer?: PublicPlayerState;
	currentPlaylist?: PlaylistElem;
}

function AdminButtons(props: IProps) {
	return (
		<>
			{props.statusPlayer?.stopping || props.statusPlayer?.streamerPause ? (
				<button
					title={i18next.t('STOP_NOW')}
					id="stopNow"
					data-namecommand="stopNow"
					className="btn btn-danger"
					onClick={props.putPlayerCommando}
				>
					<i className="fas fa-stop"></i>
				</button>
			) : (
				<button
					title={i18next.t('STOP_AFTER')}
					id="stopAfter"
					data-namecommand="stopAfter"
					className="btn btn-danger-low"
					onClick={props.putPlayerCommando}
				>
					<i className="fas fa-stop"></i>
				</button>
			)}
			<button
				title={i18next.t('PREVIOUS_SONG')}
				id="prev"
				data-namecommand="prev"
				className="btn btn-default"
				onClick={props.putPlayerCommando}
				disabled={(props.statusPlayer?.currentSong as CurrentSong)?.pos === 1}
			>
				<i className="fas fa-fast-backward" />
			</button>
			<button
				title={i18next.t('PLAY_PAUSE')}
				id="status"
				data-namecommand={props.statusPlayer && props.statusPlayer.playerStatus === 'play' ? 'pause' : 'play'}
				className="btn btn-primary"
				onClick={props.putPlayerCommando}
				disabled={props.statusPlayer?.playerStatus === 'pause' && props.currentPlaylist?.karacount === 0}
			>
				{props.statusPlayer?.playerStatus === 'play' ? (
					<i className="fas fa-pause" />
				) : (
					<i className="fas fa-play" />
				)}
			</button>
			<button
				title={i18next.t('NEXT_SONG')}
				id="skip"
				data-namecommand="skip"
				className="btn btn-default"
				onClick={props.putPlayerCommando}
				disabled={(props.statusPlayer?.currentSong as CurrentSong)?.pos === props.currentPlaylist?.karacount}
			>
				<i className="fas fa-fast-forward" />
			</button>
			<button
				title={i18next.t('REWIND')}
				id="goTo"
				data-namecommand="goTo"
				defaultValue="0"
				className="btn btn-danger-low"
				onClick={props.putPlayerCommando}
			>
				<i className="fas fa-undo-alt"></i>
			</button>
		</>
	);
}

export default AdminButtons;

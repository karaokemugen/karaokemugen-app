import i18next from 'i18next';
import React, {Component} from 'react';

import {CurrentSong} from '../../../../../src/types/playlist';
import {PublicPlayerState} from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';

interface IProps {
	putPlayerCommando: (event: any) => void;
	statusPlayer?: PublicPlayerState;
	currentPlaylist?: PlaylistElem;
}

class AdminButtons extends Component<IProps, unknown> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	render() {
		return (<>
			{
				this.props.statusPlayer?.stopping || this.props.statusPlayer?.streamerPause ?
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
				disabled={(this.props.statusPlayer?.currentSong as CurrentSong)?.pos === 1}
			>
				<i className="fas fa-fast-backward" />
			</button>
			<button
				title={i18next.t('PLAY_PAUSE')}
				id="status"
				data-namecommand={this.props.statusPlayer && this.props.statusPlayer.playerStatus === 'play' ? 'pause' : 'play'}
				className="btn btn-primary"
				onClick={this.props.putPlayerCommando}
				disabled={this.props.statusPlayer?.playerStatus === 'pause' && this.props.currentPlaylist?.karacount === 0}
			>
				{this.props.statusPlayer?.playerStatus === 'play' ? <i className="fas fa-pause" /> : <i className="fas fa-play" />}
			</button>
			<button
				title={i18next.t('NEXT_SONG')}
				id="skip"
				data-namecommand="skip"
				className="btn btn-default"
				onClick={this.props.putPlayerCommando}
				disabled={(this.props.statusPlayer?.currentSong as CurrentSong)?.pos === this.props.currentPlaylist?.karacount}
			>
				<i className="fas fa-fast-forward" />
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
		</>);
	}
}

export default AdminButtons;

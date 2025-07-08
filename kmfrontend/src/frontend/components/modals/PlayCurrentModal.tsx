import './PlayCurrentModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { KaraList } from '../../../../../src/lib/types/kara';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws';

interface IProps {
	currentPlaylist: PlaylistElem;
	displayedPlaylist: { plaid?: string; name: string };
}

function PlayCurrentModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [nextSong, setNextSong] = useState<string>();

	const playCurrentPlaylist = async () => {
		try {
			commandBackend(WS_CMD.SEND_PLAYER_COMMAND, { command: 'play' });
			closeModalWithContext();
		} catch (_) {
			// already display
		}
	};

	const switchPlaylistAndPlay = async () => {
		await commandBackend(WS_CMD.EDIT_PLAYLIST, {
			flag_current: true,
			plaid: props.displayedPlaylist.plaid,
		});
		await commandBackend(WS_CMD.SEND_PLAYER_COMMAND, { command: 'play' });
		closeModalWithContext();
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const getNextSong = async () => {
		const { index } = await commandBackend(WS_CMD.FIND_PLAYING_SONG_IN_PLAYLIST, {
			plaid: props.currentPlaylist.plaid,
		});
		const karas: KaraList = await commandBackend(WS_CMD.GET_PLAYLIST_CONTENTS, {
			plaid: props.currentPlaylist.plaid,
			from: index,
			size: 1,
		});
		setNextSong(buildKaraTitle(context.globalState.settings.data, karas.content[0], true, karas.i18n) as string);
	};

	useEffect(() => {
		getNextSong();
	}, []);

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.PLAY_CURRENT_MODAL.TITLE')}</h4>
					</ul>
					<div className="modal-body">
						<div className="modal-message text">
							<p>
								<Trans
									i18nKey="MODAL.PLAY_CURRENT_MODAL.DESCRIPTION"
									components={{ 1: <span className="important-name" /> }}
									values={{ playlist: props.currentPlaylist.name }}
								/>
							</p>
							<p>
								<Trans
									i18nKey="MODAL.PLAY_CURRENT_MODAL.DESC_OUTCOME"
									components={{ 1: <span className="important-name" /> }}
									values={{ song: nextSong }}
								/>
							</p>
						</div>
					</div>
					<div className="modal-footer">
						<button
							type="button"
							className="btn btn-action btn-primary other"
							onClick={closeModalWithContext}
						>
							<i className="fas fa-times" /> {i18next.t('CANCEL')}
						</button>
						{props.displayedPlaylist.plaid ? (
							<button
								type="button"
								className="btn btn-action btn-secondary"
								onClick={switchPlaylistAndPlay}
							>
								<i className="fas fa-shuffle" />
								&nbsp;
								<Trans
									i18nKey="MODAL.PLAY_CURRENT_MODAL.CHANGE_TO_DISPLAYED_AND_PLAY"
									components={{ 1: <span className="important-name" /> }}
									values={{ displayedPlaylistName: props.displayedPlaylist.name }}
								/>
							</button>
						) : null}
						<button type="button" className="btn btn-action btn-default ok" onClick={playCurrentPlaylist}>
							<i className="fas fa-play" /> {i18next.t('MODAL.PLAY_CURRENT_MODAL.PLAY_ANYWAY')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PlayCurrentModal;

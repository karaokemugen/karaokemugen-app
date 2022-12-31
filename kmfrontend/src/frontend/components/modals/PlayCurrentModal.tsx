import './PlayCurrentModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { KaraList } from '../../../../../src/lib/types/kara';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	currentPlaylist: PlaylistElem;
}

function PlayCurrentModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [nextSong, setNextSong] = useState<String>();

	const playCurrentPlaylist = async () => {
		try {
			commandBackend('sendPlayerCommand', { command: 'play' });
			closeModalWithContext();
		} catch (e) {
			// already display
		}
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const getNextSong = async () => {
		const { index } = await commandBackend('findPlayingSongInPlaylist', { plaid: props.currentPlaylist.plaid });
		const karas: KaraList = await commandBackend('getPlaylistContents', {
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
						<button type="button" className="btn btn-action btn-default ok" onClick={playCurrentPlaylist}>
							<i className="fas fa-check" /> {i18next.t('MODAL.PLAY_CURRENT_MODAL.PLAY_ANYWAY')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PlayCurrentModal;

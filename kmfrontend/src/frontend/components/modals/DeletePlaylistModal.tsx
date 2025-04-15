import i18next from 'i18next';
import { useContext, useState } from 'react';

import nanamiShockedPng from '../../../assets/nanami-shocked.png';
import nanamiShockedWebP from '../../../assets/nanami-shocked.webp';
import { closeModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo, setPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { nonStandardPlaylists } from '../../../utils/tools';
import SelectWithIcon from '../generic/SelectWithIcon';
import { WS_CMD } from '../../../utils/ws';

interface IProps {
	side: 'left' | 'right';
	playlistList: { value: string; label: string; icons: string[] }[];
}

function DeletePlaylistModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [plaidChosen, setPlaidChosen] = useState<string>();

	const deletePlaylist = async () => {
		const playlist = getPlaylistInfo(props.side, context);
		const oppositePlaylist = getOppositePlaylistInfo(props.side, context);

		try {
			if (plaidChosen) {
				await commandBackend(WS_CMD.EDIT_PLAYLIST, {
					flag_whitelist: playlist.flag_whitelist,
					flag_blacklist: playlist.flag_blacklist,
					flag_current:
						playlist.flag_current || context.globalState.settings.data.state.currentPlaid === plaidChosen,
					flag_public:
						playlist.flag_public || context.globalState.settings.data.state.publicPlaid === plaidChosen,
					plaid: plaidChosen,
				});
				await setSettings(context.globalDispatch);
			} else {
				setPlaylistInfo(
					props.side,
					context,
					oppositePlaylist.plaid === context.globalState.settings.data.state.publicPlaid
						? nonStandardPlaylists.library
						: context.globalState.settings.data.state.publicPlaid
				);
				try {
					commandBackend(WS_CMD.DELETE_PLAYLIST, {
						plaid: playlist.plaid,
					});
				} catch (_) {
					// already display
				}
			}
			closeModalWithContext();
		} catch (_) {
			// already display
		}
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const playlist = getPlaylistInfo(props.side, context);
	const message = playlist.flag_whitelist
		? 'MODAL.DELETE_PLAYLIST_MODAL.DELETE_WHITELIST'
		: playlist.flag_blacklist
			? 'MODAL.DELETE_PLAYLIST_MODAL.DELETE_BLACKLIST'
			: playlist.flag_current && playlist.flag_public
				? 'MODAL.DELETE_PLAYLIST_MODAL.DELETE_CURRENT_PUBLIC'
				: playlist.flag_public
					? 'MODAL.DELETE_PLAYLIST_MODAL.DELETE_PUBLIC'
					: playlist.flag_current
						? 'MODAL.DELETE_PLAYLIST_MODAL.DELETE_CURRENT'
						: null;
	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">
							<picture>
								<source type="image/webp" srcSet={nanamiShockedWebP} />
								<source type="image/png" srcSet={nanamiShockedPng} />
								<img src={nanamiShockedPng} alt="Nanami is shocked oO" />
							</picture>
							{i18next.t('MODAL.DELETE_PLAYLIST_MODAL.TITLE', {
								playlist: playlist.name,
							})}
						</h4>
					</ul>
					{message ? (
						<div className="modal-body">
							<div className="modal-message text">
								<p>{i18next.t(message)}</p>
								<SelectWithIcon
									list={props.playlistList}
									value={plaidChosen}
									onChange={(value: string) => setPlaidChosen(value)}
								/>
							</div>
						</div>
					) : null}
					<div className="modal-footer">
						<button
							type="button"
							className="btn btn-action btn-primary other"
							onClick={closeModalWithContext}
						>
							<i className="fas fa-times" /> {i18next.t('CANCEL')}
						</button>
						<button type="button" className="btn btn-action btn-default ok" onClick={deletePlaylist}>
							<i className="fas fa-check" /> {i18next.t('YES')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default DeletePlaylistModal;

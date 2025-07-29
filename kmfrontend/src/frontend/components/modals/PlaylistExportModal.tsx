import i18next from 'i18next';
import { getFavoritesExportFileName, getPlaylistExportFileName } from '../../../utils/playlist';
import { closeModal } from '../../../store/actions/modal';
import { useContext, useEffect, useState } from 'react';
import GlobalContext from '../../../store/context';
import { getPlaylistInfo } from '../../../utils/kara';
import { nonStandardPlaylists } from '../../../utils/tools';
import { WS_CMD } from '../../../utils/ws';
import { commandBackend } from '../../../utils/socket';
import { DBPL } from '../../../../../src/types/database/playlist';
import Switch from '../generic/Switch';
import { v4 as UUIDv4 } from 'uuid';

interface IProps {
	side: 'left' | 'right';
}

type RemotePlaylistStatus = 'fetching' | 'owned' | 'not-owned' | 'does-not-exist';

function PlaylistExportModal(props: IProps) {
	const context = useContext(GlobalContext);
	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const [playlist, setPlaylist] = useState<DBPL>();
	const [copyPlaylist, setCopyPlaylist] = useState(false);

	const [login, instance] = context.globalState.auth.data.username.split('@');

	const [playlistRemoteStatus, setRemotePlaylistStatus] = useState<RemotePlaylistStatus>('fetching');

	useEffect(() => {
		const playlist = getPlaylistInfo(props.side, context);
		setPlaylist(playlist);
	}, []);

	useEffect(() => {
		getRemotePlaylistStatus();
	}, [playlist]);

	const getRemotePlaylistStatus = async () => {
		if (playlist && playlist.plaid !== nonStandardPlaylists.favorites) {
			try {
				const res = await commandBackend(
					WS_CMD.GET_PLAYLIST_FROM_KM_SERVER,
					{
						plaid: playlist.plaid,
					},
					false,
					30000,
					true
				);
				if (
					res.PlaylistInformation.username === login ||
					res.PlaylistInformation.contributors.map(c => c.username).includes(login)
				) {
					setRemotePlaylistStatus('owned');
				} else {
					setRemotePlaylistStatus('not-owned');
				}
			} catch (_) {
				setRemotePlaylistStatus('does-not-exist');
			}
		}
	};

	const exportPlaylistToRemote = async () => {
		try {
			const responseExport = await commandBackend(WS_CMD.EXPORT_PLAYLIST, { plaid: playlist.plaid });
			if (playlistRemoteStatus === 'not-owned') responseExport.PlaylistInformation.plaid = UUIDv4();
			await commandBackend(WS_CMD.POST_PLAYLIST_TO_KM_SERVER, { pl: responseExport });
		} catch (_) {
			// already display
		}
		closeModalWithContext();
	};

	const exportPlaylistToFile = async () => {
		let url;
		let data;
		if (playlist.plaid === nonStandardPlaylists.favorites) {
			url = WS_CMD.EXPORT_FAVORITES;
		} else {
			url = WS_CMD.EXPORT_PLAYLIST;
			data = { plaid: playlist.plaid };
		}
		if (url) {
			try {
				const response = await commandBackend(url, data);
				const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response, null, 4));
				const dlAnchorElem = document.getElementById('downloadAnchorElem');
				if (dlAnchorElem) {
					dlAnchorElem.setAttribute('href', dataStr);
					const fileName =
						playlist?.plaid === nonStandardPlaylists.favorites
							? getFavoritesExportFileName(context.globalState.auth.data.username)
							: getPlaylistExportFileName(playlist);
					dlAnchorElem.setAttribute('download', fileName);
					dlAnchorElem.click();
				}
			} catch (_) {
				// already display
			}
		}
		closeModalWithContext();
	};

	if (!playlist) {
		return null;
	}

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">
							{i18next.t('MODAL.PLAYLIST_EXPORT.TITLE', {
								playlistName: playlist.name,
							})}
						</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body flex-direction-btns">
						{playlist.plaid === nonStandardPlaylists.favorites ? null : (
							<>
								{playlistRemoteStatus === 'not-owned' &&
									i18next.t('MODAL.PLAYLIST_EXPORT.DESCRIPTION_NOT_OWNED_ON_SERVER', {
										serverName: instance,
									})}
								{playlistRemoteStatus === 'owned' &&
									i18next.t('MODAL.PLAYLIST_EXPORT.DESCRIPTION_OWNED_ON_SERVER', {
										serverName: instance,
									})}
								{playlistRemoteStatus === 'does-not-exist' &&
									i18next.t('MODAL.PLAYLIST_EXPORT.DESCRIPTION_DOES_NOT_EXIST_ON_SERVER', {
										serverName: instance,
									})}
								{playlistRemoteStatus === 'not-owned' ? (
									<div className="flex-line flex-center flex-align-center">
										<Switch
											isChecked={copyPlaylist}
											handleChange={() => setCopyPlaylist(!copyPlaylist)}
											onLabel={i18next.t('YES')}
											offLabel={i18next.t('NO')}
										/>
										{i18next.t('MODAL.PLAYLIST_EXPORT.COPY_PLAYLIST')}
									</div>
								) : null}
								<div>
									<button
										className="btn btn-default"
										type="button"
										disabled={!copyPlaylist && playlistRemoteStatus === 'not-owned'}
										onClick={exportPlaylistToRemote}
									>
										<i className="fas fa-fw fa-cloud fa-2x" />
										<div className="btn-large-container">
											<div className="title">
												{i18next.t('MODAL.PLAYLIST_EXPORT.EXPORT_TO_SERVER')}
											</div>
										</div>
									</button>
								</div>
							</>
						)}
						<div>
							<button className="btn btn-default" type="button" onClick={exportPlaylistToFile}>
								<i className="fas fa-fw fa-file fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.PLAYLIST_EXPORT.EXPORT_TO_FILE')}</div>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PlaylistExportModal;

import i18next from 'i18next';
import React, { useContext, useEffect } from 'react';

import { User } from '../../../../../src/lib/types/user';
import nanamiShockedPng from '../../../assets/nanami-shocked.png';
import nanamiShockedWebP from '../../../assets/nanami-shocked.webp';
import { showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo, setPlaylistInfo } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { callModal, displayMessage, isNonStandardPlaylist, nonStandardPlaylists } from '../../../utils/tools';
import DeletePlaylistModal from './DeletePlaylistModal';
import FavMixModal from './FavMixModal';
import PlaylistModal from './PlaylistModal';
import ShuffleModal from './ShuffleModal';

interface IProps {
	side: 'left' | 'right';
	criteriasOpen: boolean;
	topKaraMenu: number;
	leftKaraMenu: number;
	closePlaylistCommands: () => void;
	playlistWillUpdate: () => void;
	playlistDidUpdate: () => void;
	addAllKaras: () => void;
	addRandomKaras: () => void;
	downloadAllMedias: () => void;
	getListToSelect: () => { value: string; label: string; icons: string[] }[];
}

function PlaylistCommandsModal(props: IProps) {
	const context = useContext(GlobalContext);

	const openShuffleModal = () => {
		props.closePlaylistCommands();
		const playlist = getPlaylistInfo(props.side, context);
		showModal(
			context.globalDispatch,
			<ShuffleModal
				idPlaylist={playlist?.plaid}
				playlistWillUpdate={props.playlistWillUpdate}
				playlistDidUpdate={props.playlistDidUpdate}
			/>
		);
	};

	const startFavMix = async () => {
		props.closePlaylistCommands();
		const response = await commandBackend('getUsers');
		const userList = response.filter((u: User) => (u.type as number) < 2);
		showModal(context.globalDispatch, <FavMixModal side={props.side} userList={userList} />);
	};

	const exportPlaylist = async () => {
		props.closePlaylistCommands();
		let url;
		let data;
		const playlist = getPlaylistInfo(props.side, context);
		if (playlist?.plaid === nonStandardPlaylists.favorites) {
			url = 'exportFavorites';
		} else if (!isNonStandardPlaylist(playlist?.plaid)) {
			url = 'exportPlaylist';
			data = { plaid: playlist?.plaid };
		}
		if (url) {
			try {
				const response = await commandBackend(url, data);
				const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response, null, 4));
				const dlAnchorElem = document.getElementById('downloadAnchorElem');
				if (dlAnchorElem) {
					dlAnchorElem.setAttribute('href', dataStr);
					if (playlist?.plaid === nonStandardPlaylists.favorites) {
						dlAnchorElem.setAttribute(
							'download',
							[
								'KaraMugen',
								'fav',
								context.globalState.auth.data.username,
								new Date().toLocaleDateString().replace('\\', '-'),
							].join('_') + '.kmfavorites'
						);
					} else {
						dlAnchorElem.setAttribute(
							'download',
							['KaraMugen', playlist?.name, new Date().toLocaleDateString().replace('\\', '-')].join(
								'_'
							) + '.kmplaylist'
						);
					}
					dlAnchorElem.click();
				}
			} catch (e) {
				// already display
			}
		}
	};

	const addOrEditPlaylist = (mode: 'create' | 'edit') => {
		props.closePlaylistCommands();
		showModal(context.globalDispatch, <PlaylistModal side={props.side} mode={mode} />);
	};

	const deletePlaylist = () => {
		props.closePlaylistCommands();
		const playlist = getPlaylistInfo(props.side, context);
		const playlistList = props
			.getListToSelect()
			.filter((pl) => !isNonStandardPlaylist(pl.value) && pl.value !== playlist?.plaid);
		if (playlistList.length === 0) displayMessage('error', i18next.t('MODAL.DELETE_PLAYLIST_MODAL.IMPOSSIBLE'));
		else showModal(context.globalDispatch, <DeletePlaylistModal side={props.side} playlistList={playlistList} />);
	};

	const importPlaylistResponse = (data, file) => {
		if (data.reposUnknown?.length > 0) {
			callModal(
				context.globalDispatch,
				'confirm',
				i18next.t('MODAL.UNKNOW_REPOS.TITLE'),
				<React.Fragment>
					<p>{i18next.t('MODAL.UNKNOW_REPOS.DESCRIPTION')}</p>
					<div>{i18next.t('MODAL.UNKNOW_REPOS.DOWNLOAD_THEM')}</div>
					<br />
					{data.reposUnknown.map((repository: string) => (
						<label key={repository}>{repository}</label>
					))}
				</React.Fragment>,
				() =>
					data.reposUnknown.map((repoName: string) => {
						commandBackend('addRepo', {
							Name: repoName,
							Online: true,
							Enabled: true,
							SendStats: false,
							AutoMediaDownloads: 'updateOnly',
							MaintainerMode: false,
							Git: null,
							BaseDir: `repos/${repoName}`,
							Path: {
								Medias: [`repos/${repoName}/medias`],
							},
						});
					})
			);
		}
		const plaid = file?.name.includes('.kmfavorites') ? nonStandardPlaylists.favorites : data.plaid;
		setPlaylistInfo(props.side, context, plaid);
	};

	const importPlaylist = (e: any) => {
		props.closePlaylistCommands();
		let url: string;
		let fr: FileReader;
		let file: File;
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		if (e.target.files && e.target.files[0]) {
			file = e.target.files[0];
			fr = new FileReader();
			fr.onload = async () => {
				const data: {
					playlist?: string | ArrayBuffer | null;
					favorites?: string | ArrayBuffer | null;
					blcSet?: string | ArrayBuffer | null;
				} = {};
				let name: string;
				const json = JSON.parse(fr.result as string);
				if (file.name.includes('.kmfavorites')) {
					data.favorites = json;
					url = 'importFavorites';
					name = 'Favs';
				} else {
					url = 'importPlaylist';
					data.playlist = json;
					name = json?.PlaylistInformation?.name;
				}
				const response = await commandBackend(url, data);
				if (response.message.data.reposUnknown?.length > 0) {
					importPlaylistResponse(response.message.data, file);
				} else {
					!file?.name.includes('.kmfavorites') &&
						displayMessage('success', i18next.t(`SUCCESS_CODES.${response.message.code}`, { data: name }));
					const plaid = file?.name.includes('.kmfavorites')
						? nonStandardPlaylists.favorites
						: response.message.data.plaid;
					setPlaylistInfo(props.side, context, plaid);
				}
			};
			fr.readAsText(file);
		}
	};

	const deleteAllKaras = () => {
		props.closePlaylistCommands();
		const playlist = getPlaylistInfo(props.side, context);
		callModal(
			context.globalDispatch,
			'confirm',
			<>
				<picture>
					<source type="image/webp" srcSet={nanamiShockedWebP} />
					<source type="image/png" srcSet={nanamiShockedPng} />
					<img src={nanamiShockedPng} alt="Nanami is shocked oO" />
				</picture>
				{i18next.t('CL_EMPTY_LIST')}
			</>,
			'',
			() => {
				if (playlist?.flag_smart) {
					commandBackend('emptyCriterias', { plaid: playlist?.plaid });
				} else {
					commandBackend('emptyPlaylist', { plaid: playlist?.plaid });
				}
			}
		);
	};

	const handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal') && !(e.target as Element).closest('.karaLineButton')) {
			e.preventDefault();
			props.closePlaylistCommands();
		}
	};

	useEffect(() => {
		getSocket().on('playlistImported', importPlaylistResponse);
		return () => {
			getSocket().off('playlistImported', importPlaylistResponse);
		};
	}, []);

	useEffect(() => {
		document.getElementById('root').addEventListener('click', handleClick);
		return () => {
			document.getElementById('root').removeEventListener('click', handleClick);
		};
	}, []);

	const playlist = getPlaylistInfo(props.side, context);
	const oppositePlaylist = getOppositePlaylistInfo(props.side, context);
	return (
		<ul
			className="dropdown-menu"
			style={{
				position: 'absolute',
				zIndex: 9998,
				bottom:
					window.innerHeight < props.topKaraMenu + 250
						? window.innerHeight - props.topKaraMenu + 35
						: undefined,
				top: window.innerHeight < props.topKaraMenu + 250 ? undefined : props.topKaraMenu,
				left: window.innerWidth < props.leftKaraMenu + 250 ? window.innerWidth - 250 : props.leftKaraMenu,
			}}
		>
			{!isNonStandardPlaylist(playlist?.plaid) ? (
				<li>
					<a href="#" onClick={openShuffleModal}>
						<i className="fas fa-fw fa-random" />
						{i18next.t('ADVANCED.SHUFFLE')}
					</a>
				</li>
			) : null}
			{!isNonStandardPlaylist(oppositePlaylist?.plaid) && !props.criteriasOpen ? (
				<React.Fragment>
					<li>
						<a
							href="#"
							onClick={() => {
								props.closePlaylistCommands();
								props.addAllKaras();
							}}
							className="danger-hover"
						>
							<i className="fas fa-fw fa-share" />
							{i18next.t('ADVANCED.ADD_ALL')}
						</a>
					</li>
					{!isNonStandardPlaylist(playlist?.plaid) || playlist?.plaid === nonStandardPlaylists.library ? (
						<li>
							<a
								href="#"
								onClick={() => {
									props.closePlaylistCommands();
									props.addRandomKaras();
								}}
							>
								<i className="fas fa-fw fa-dice" />
								{i18next.t('ADVANCED.ADD_RANDOM')}
							</a>
						</li>
					) : null}
				</React.Fragment>
			) : null}
			{!isNonStandardPlaylist(playlist?.plaid) ||
			props.criteriasOpen ||
			playlist?.plaid === context.globalState.settings.data.state.whitelistPlaid ? (
				<li>
					<a href="#" onClick={deleteAllKaras} className="danger-hover">
						<i className="fas fa-fw fa-eraser" />
						{i18next.t('ADVANCED.EMPTY_LIST')}
					</a>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist?.plaid) ? (
				<React.Fragment>
					<li>
						<a href="#" onClick={deletePlaylist} className="danger-hover">
							<i className="fas fa-fw fa-trash" />
							{i18next.t('ADVANCED.DELETE')}
						</a>
					</li>
					<li>
						<a href="#" onClick={() => addOrEditPlaylist('edit')}>
							<i className="fas fa-fw fa-pencil-alt" />
							{i18next.t('ADVANCED.EDIT')}
						</a>
					</li>
				</React.Fragment>
			) : null}
			{playlist?.plaid !== nonStandardPlaylists.library ? (
				<li>
					<a href="#" onClick={exportPlaylist}>
						<i className="fas fa-fw fa-upload" />
						{i18next.t(
							playlist?.plaid === nonStandardPlaylists.favorites ? 'FAVORITES_EXPORT' : 'ADVANCED.EXPORT'
						)}
					</a>
				</li>
			) : null}
			{playlist?.plaid !== nonStandardPlaylists.library && !props.criteriasOpen ? (
				<li>
					<a
						href="#"
						onClick={() => {
							props.closePlaylistCommands();
							props.downloadAllMedias();
						}}
					>
						<i className="fas fa-fw fa-cloud-download-alt" />
						{i18next.t('ADVANCED.DOWNLOAD_ALL')}
					</a>
				</li>
			) : null}
			<hr />
			<li>
				<a href="#" onClick={() => addOrEditPlaylist('create')}>
					<i className="fas fa-fw fa-plus" />
					{i18next.t('ADVANCED.ADD')}
				</a>
			</li>
			{!props.criteriasOpen ? (
				<li>
					<a href="#" onClick={startFavMix}>
						<i className="fas fa-fw fa-bolt" />
						{i18next.t('ADVANCED.AUTOMIX')}
					</a>
				</li>
			) : null}
			<li>
				<a href="#">
					<label className="importFile" htmlFor={'import-file' + props.side}>
						<i className="fas fa-fw fa-download" />
						{i18next.t(
							playlist?.plaid === nonStandardPlaylists.favorites ? 'FAVORITES_IMPORT' : 'ADVANCED.IMPORT'
						)}
					</label>
				</a>
				<input
					id={'import-file' + props.side}
					className="import-file"
					type="file"
					style={{ display: 'none' }}
					accept=".kmplaylist, .kmfavorites, .kmblc"
					onChange={importPlaylist}
				/>
			</li>
		</ul>
	);
}

export default PlaylistCommandsModal;

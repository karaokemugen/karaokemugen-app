import './PlaylistImportModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useMemo, useState } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend, getSocket } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws';
import { setPlaylistInfo } from '../../../utils/kara';
import { callModal, displayMessage, secondsTimeSpanToHMS } from '../../../utils/tools';
import type { OrderParam, PlaylistExport, ServerDBPL } from '../../../../../src/lib/types/playlist';
import _ from 'lodash';
import i18n from '../../../utils/i18n';
import nanamiThinkPng from '../../../assets/nanami-think.png';
import nanamiThinkWebP from '../../../assets/nanami-think.webp';

interface IProps {
	side: 'left' | 'right';
}

type ImportStatus = 'downloaded' | 'not-downloaded' | 'downloading';

function PlaylistImportModal(props: IProps) {
	const context = useContext(GlobalContext);

	const nickname = context.globalState.settings.data.user.nickname;

	const remoteServerName = context.globalState.settings.data.user.login.split('@')[1];

	const PAGE_SIZE = 5;

	const [searchQuery, setSearchQuery] = useState('');

	const [playlists, setPlaylists] = useState<ServerDBPL[]>([]);

	const [playlistImportStatus, setPlaylistImportStatus] = useState<Record<string, ImportStatus>>({});

	const [sortOption, setSortOption] = useState<OrderParam>('az');

	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

	const [filterOptions, setFilterOptions] = useState<Record<'my' | 'downloaded', boolean>>({
		my: false,
		downloaded: false,
	});

	const [showSortOrFilterOptions, setShowSortOrFilterOptions] = useState<false | 'sort' | 'filter'>(false);

	const [page, setPage] = useState(1);

	const [loading, setLoading] = useState(true);

	const [connectionError, setConnectionError] = useState(false);

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const hideSortOrFilterOptionsMenu = (e: MouseEvent) => {
		if (
			!(e.target as Element).closest('.sort-options') &&
			!(e.target as Element).closest('.filter-options') &&
			!(e.target as Element).closest('.show-sort-options') &&
			!(e.target as Element).closest('.show-filter-options')
		) {
			setShowSortOrFilterOptions(false);
		}
	};

	useEffect(() => {
		fetchRemoteServerData();
	}, []);

	useEffect(() => {
		document.addEventListener('click', hideSortOrFilterOptionsMenu);
		return () => {
			document.removeEventListener('click', hideSortOrFilterOptionsMenu);
		};
	}, []);

	useEffect(() => {
		setPage(1);
	}, [searchQuery, filterOptions]);

	useEffect(() => {
		getSocket().on('playlistImported', importPlaylistResponse);
		return () => {
			getSocket().off('playlistImported', importPlaylistResponse);
		};
	}, []);

	const fetchRemoteServerData = () => {
		setLoading(true);
		setConnectionError(false);
		commandBackend(WS_CMD.GET_PLAYLISTS).then(downloadedPlaylists => {
			commandBackend(WS_CMD.GET_PLAYLISTS_FROM_KM_SERVER, {
				filter: '',
				myPlaylistsOnly: false,
			})
				.then(res => {
					setPlaylists(res);
					setPlaylistImportStatus(
						Object.fromEntries(
							res.map(pl => {
								return [
									pl.plaid,
									downloadedPlaylists.some(dlpl => dlpl.plaid === pl.plaid)
										? 'downloaded'
										: 'not-downloaded',
								];
							})
						)
					);
					setLoading(false);
				})
				.catch((err: Error) => {
					if (err.message === 'REMOTE_SERVER_CONNECTION_ERROR') {
						setConnectionError(true);
						setLoading(false);
					}
				});
		});
	};

	const filteredPlaylists = () => {
		return playlists
			.filter(pl => !filterOptions.downloaded || playlistImportStatus[pl.plaid] !== 'not-downloaded')
			.filter(
				pl =>
					!filterOptions.my ||
					pl.contributors.map(c => c.username).includes(nickname) ||
					pl.nickname === nickname
			)
			.filter(pl => {
				const contributors = pl?.contributors.map(c => c.username).reduce((c1, c2) => `${c1} ${c2}`, '') ?? '';
				const searchIndex = `${pl.name} ${contributors} ${pl.nickname}`.toLowerCase();
				return searchIndex.includes(searchQuery.toLowerCase());
			});
	};

	const sortedAndFilteredPlaylists = useMemo(() => {
		if (sortOrder === 'desc') {
			return filteredPlaylists()
				.sort((pl1, pl2) => {
					if (sortOption === 'az') {
						return pl1.name.localeCompare(pl2.name);
					} else if (sortOption === 'recent') {
						return pl1?.created_at > pl2?.created_at ? 1 : -1;
					} else if (sortOption === 'favorited') {
						return pl1?.favorited - pl2?.favorited;
					} else if (sortOption === 'karacount') {
						return pl1?.karacount - pl2?.karacount;
					} else if (sortOption === 'username') {
						return pl1?.username.localeCompare(pl2?.username ?? '') ?? 1;
					} else if (sortOption === 'duration') {
						return pl1.duration - pl2.duration;
					}
				})
				.reverse();
		}
		return filteredPlaylists().sort((pl1, pl2) => {
			if (sortOption === 'az') {
				return pl1.name.localeCompare(pl2.name);
			} else {
				return pl1.duration - pl2.duration;
			}
		});
	}, [searchQuery, sortOrder, sortOption, playlists, filterOptions]);

	const paginatedPlaylists = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		const end =
			page * PAGE_SIZE > sortedAndFilteredPlaylists.length ? sortedAndFilteredPlaylists.length : page * PAGE_SIZE;
		return sortedAndFilteredPlaylists.slice(start, end);
	}, [page, searchQuery, sortOrder, sortOption, playlists, filterOptions]);

	const toggleFilterOption = (fo: 'my' | 'downloaded') => {
		setFilterOptions({
			...filterOptions,
			[fo]: !filterOptions[fo],
		});
	};

	const importPlaylistFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		let fr: FileReader;
		let file: File;
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		if (e.target.files && e.target.files[0]) {
			try {
				file = e.target.files[0];
				fr = new FileReader();
				fr.onload = async () => {
					const playlist: PlaylistExport = JSON.parse(fr.result as string);
					const response = await commandBackend(WS_CMD.IMPORT_PLAYLIST, { playlist });
					if (response.message.data.unknownRepos?.length > 0) {
						importPlaylistResponse(response.message.data);
					} else {
						displayMessage(
							'success',
							i18next.t(`SUCCESS_CODES.${response.message.code}`, {
								data: playlist.PlaylistInformation.name,
							})
						);
						const plaid = response.message.data.plaid;
						setPlaylistInfo(props.side, context, plaid);
						closeModalWithContext();
					}
				};
				fr.readAsText(file);
			} catch (_) {
				// already display
			}
		}
	};

	const importPlaylistResponse = (data: { plaid: string; unknownRepos: string[] }) => {
		if (data.unknownRepos?.length > 0) {
			closeModalWithContext();
			callModal(
				context.globalDispatch,
				'confirm',
				i18next.t('MODAL.UNKNOWN_REPOS.TITLE'),
				<>
					<p>{i18next.t('MODAL.UNKNOWN_REPOS.DESCRIPTION')}</p>
					<div>{i18next.t('MODAL.UNKNOWN_REPOS.DOWNLOAD_THEM')}</div>
					<br />
					{data.unknownRepos.map((repository: string) => (
						<label key={repository}>{repository}</label>
					))}
				</>,
				() =>
					data.unknownRepos.forEach((repoName: string) => {
						commandBackend(WS_CMD.ADD_REPO, {
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
							Update: true,
						});
					})
			);
		}
		const plaid = data.plaid;
		setPlaylistInfo(props.side, context, plaid);
	};

	const importRemotePlaylist = async (pl: ServerDBPL) => {
		setPlaylistImportStatus({
			...playlistImportStatus,
			[pl.plaid]: 'downloading',
		});
		const plExport: PlaylistExport = await commandBackend(WS_CMD.GET_PLAYLIST_FROM_KM_SERVER, {
			plaid: pl.plaid,
		});
		const response = await commandBackend(WS_CMD.IMPORT_PLAYLIST, { playlist: plExport });
		setPlaylistImportStatus({
			...playlistImportStatus,
			[pl.plaid]: 'downloaded',
		});
		displayMessage(
			'success',
			i18next.t(`SUCCESS_CODES.${response.message.code}`, { data: plExport.PlaylistInformation.name })
		);
		setPlaylistInfo(props.side, context, pl.plaid);
	};

	const pageNumbers = () => {
		// We want to show 2 values around current, ellipsis if needed and start and end
		let numbersToShow: (number | '.')[] = [];
		const numberOfPages = Math.ceil(sortedAndFilteredPlaylists.length / PAGE_SIZE);
		const aroundCurrentPage = _.range(page - 2, page + 3);
		if (aroundCurrentPage.includes(2) && aroundCurrentPage.includes(numberOfPages - 1)) {
			numbersToShow = _.range(1, numberOfPages);
		} else if (aroundCurrentPage.includes(2)) {
			numbersToShow = [..._.range(1, Math.max(page + 2, 5) + 1), '.', numberOfPages];
		} else if (aroundCurrentPage.includes(numberOfPages - 1)) {
			numbersToShow = [1, '.', ..._.range(Math.min(page - 2, numberOfPages - 5), numberOfPages + 1)];
		} else {
			numbersToShow = [1, '.', ...aroundCurrentPage, '.', numberOfPages];
		}

		return numbersToShow.map((num, i) => {
			if (num === '.') {
				return <div key={i}>…</div>;
			} else {
				return num === page ? (
					<button key={i} className="btn btn-primary page-number current">
						{num}
					</button>
				) : (
					<button key={i} className="btn btn-action page-number" onClick={() => setPage(num)}>
						{num}
					</button>
				);
			}
		});
	};

	const playlistCard = (pl: ServerDBPL, i: number) => {
		return (
			<div key={i} className="playlist-card">
				<div className="pl-infos">
					<h2 className="card-title">{pl.name}</h2>
					{pl.description && <h3 title={pl.description}>{pl.description}</h3>}
					<div>
						{i18n.t('MODAL.PLAYLIST_IMPORT.KARA_COUNT', { karacount: pl.karacount })} -{' '}
						{i18n.t('MODAL.PLAYLIST_IMPORT.DURATION', {
							duration: secondsTimeSpanToHMS(pl.duration, 'hm'),
						})}
					</div>
					<i>{localizedAuthorAndContributorsInfo(pl)}</i>
				</div>
				{playlistImportStatus[pl.plaid] === 'downloading' && (
					<button className="btn btn-action pl-download" disabled>
						<div className="inline-loader" />
					</button>
				)}
				{playlistImportStatus[pl.plaid] === 'not-downloaded' && (
					<button
						className="btn btn-action pl-download"
						title={i18n.t('MODAL.PLAYLIST_IMPORT.DOWNLOAD_PLAYLIST')}
						onClick={() => importRemotePlaylist(pl)}
					>
						<i className="fas fa-download" />
					</button>
				)}
				{playlistImportStatus[pl.plaid] === 'downloaded' && (
					<button
						className="btn btn-action pl-download"
						title={i18n.t('MODAL.PLAYLIST_IMPORT.UPDATE_PLAYLIST')}
						onClick={() => importRemotePlaylist(pl)}
					>
						<i className="fas fa-circle-down" />
					</button>
				)}
			</div>
		);
	};

	const localizedAuthorAndContributorsInfo = (pl: ServerDBPL) => {
		const authorPart = i18n.t('MODAL.PLAYLIST_IMPORT.BY_AUTHOR', { author: pl.username });
		const contributorPart =
			pl.contributors.length > 3
				? i18n.t('MODAL.PLAYLIST_IMPORT.AND_CONTRIBUTORS_AND_MORE', {
						contributors: pl.contributors.slice(0, 3).map(c => c.username),
						numberOfOthers: pl.contributors.length - 3,
					})
				: i18n.t('MODAL.PLAYLIST_IMPORT.AND_CONTRIBUTORS', {
						contributors: pl.contributors.map(c => c.username),
					});
		if (pl.contributors.length) {
			return `${authorPart} ${contributorPart}`;
		} else {
			return authorPart;
		}
	};

	return (
		<div className="modal modalPage" id="playlist-import-modal">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.PLAYLIST_IMPORT.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body">
						<div className="modal-search-bar">
							<input
								id="playlist-import"
								type="file"
								onChange={importPlaylistFromFile}
								style={{ display: 'none' }}
							/>
							<button
								className="btn btn-action"
								title={i18n.t('MODAL.PLAYLIST_IMPORT.IMPORT_FROM_FILE')}
								onClick={() => {
									document.getElementById('playlist-import').click();
								}}
							>
								<i className="fa-solid fa-file" />
							</button>

							<input
								id="playlistSearch"
								className="plSearch"
								placeholder={`\uF002 ${i18next.t('SEARCH')}`}
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>

							<div className="btn-group">
								<button
									className="btn btn-action"
									onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
								>
									{sortOrder === 'asc' ? (
										<i className={'fa-solid fa-arrow-up-wide-short'} />
									) : (
										<i className={'fa-solid fa-arrow-down-wide-short'} />
									)}
								</button>
								<button
									className={'btn btn-action show-sort-options'}
									onClick={() =>
										setShowSortOrFilterOptions(showSortOrFilterOptions === 'sort' ? false : 'sort')
									}
									title={i18n.t('MODAL.PLAYLIST_IMPORT.SORT_OPTIONS')}
								>
									<div className="sort-option-label">
										{i18n.t(`MODAL.PLAYLIST_IMPORT.SORT_OPTIONS_LABELS.${sortOption}`)}
									</div>
									{/* To place the arrow and have good ellipsis */}
									<div className="small-arrow" />
								</button>
								{showSortOrFilterOptions === 'sort' ? (
									<ul className="sort-options dropdown-menu">
										{(
											[
												'az',
												'favorited',
												'username',
												'recent',
												'karacount',
												'duration',
											] as OrderParam[]
										).map(so => (
											<li
												key={so}
												onClick={() => {
													setSortOption(so);
													setShowSortOrFilterOptions(false);
												}}
											>
												<div>{i18n.t(`MODAL.PLAYLIST_IMPORT.SORT_OPTIONS_LABELS.${so}`)}</div>
											</li>
										))}
									</ul>
								) : null}
								{showSortOrFilterOptions === 'filter' ? (
									<ul className="filter-options dropdown-menu">
										{(['my', 'downloaded'] as ('my' | 'downloaded')[]).map(fo => (
											<li key={fo} onClick={() => toggleFilterOption(fo)}>
												<div>
													<i
														className={
															filterOptions[fo] ? 'fas fa-check-square' : 'fas fa-square'
														}
													/>
													{i18n.t(`MODAL.PLAYLIST_IMPORT.FILTER_LABELS.${fo}`)}
												</div>
											</li>
										))}
									</ul>
								) : null}
								<button
									className="btn btn-action show-filter-options"
									onClick={() =>
										setShowSortOrFilterOptions(
											showSortOrFilterOptions === 'filter' ? false : 'filter'
										)
									}
									title={i18n.t('MODAL.PLAYLIST_IMPORT.FILTERS')}
								>
									<i className="fa-solid fa-filter" />
								</button>
							</div>
						</div>
						{connectionError && (
							<div className="connection-error">
								<div>
									{i18next.t('MODAL.PLAYLIST_IMPORT.CONNECTION_ERROR_TO_REMOTE_SERVER', {
										serverName: remoteServerName,
									})}
								</div>
								<div>
									<button
										className="btn btn-action refresh-button"
										onClick={() => fetchRemoteServerData()}
									>
										<i className="fa-solid fa-refresh" />
									</button>
								</div>
								<picture className="nanami-thinking">
									<source type="image/webp" srcSet={nanamiThinkWebP} />
									<source type="image/png" srcSet={nanamiThinkPng} />
									<img src={nanamiThinkPng} alt="Nanami is thinking..." />
								</picture>
							</div>
						)}
						{paginatedPlaylists.length > 0 && !loading ? (
							<>
								<div className="playlist-cards">
									{paginatedPlaylists.map((pl, i) => playlistCard(pl, i))}
								</div>
								<div className="page-numbers">{paginatedPlaylists.length ? pageNumbers() : null}</div>
							</>
						) : paginatedPlaylists.length === 0 && !loading ? null : (
							<div className="loader" />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default PlaylistImportModal;
